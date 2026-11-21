from collections import Counter
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from accountable import db, repo, rules, seed
from accountable.config import Settings
from accountable.db import activities, contacts, deals, organizations
from accountable.main import create_app

from conftest import TODAY


@pytest.fixture
def seeded(db_path):
    """An app whose new database was filled with sample data on first start (REQ-1)."""
    app = create_app(Settings(db_path=db_path, test_mode=True, seed_new_db=True))
    with TestClient(app) as c:
        yield c


def rows(client, table):
    with client.app.state.engine.connect() as conn:
        return [dict(r) for r in conn.execute(select(table)).mappings()]


def month_key(d: date) -> tuple[int, int]:
    return (d.year, d.month)


def last_12_months(today: date) -> list[tuple[int, int]]:
    index = today.year * 12 + today.month - 1
    return [((index - k) // 12, (index - k) % 12 + 1) for k in range(12)]


def test_counts_in_range(seeded):
    assert 12 <= len(rows(seeded, organizations)) <= 18
    assert 36 <= len(rows(seeded, contacts)) <= 44
    assert 55 <= len(rows(seeded, deals)) <= 65
    assert 180 <= len(rows(seeded, activities)) <= 220
    assert len({o["industry"] for o in rows(seeded, organizations)}) >= 6


def test_every_status_and_stage_present(seeded):
    assert {c["status"] for c in rows(seeded, contacts)} == {"lead", "qualified", "customer"}
    assert {d["stage"] for d in rows(seeded, deals)} == set(rules.STAGES)


def test_dates_relative_to_today(seeded):
    all_deals = rows(seeded, deals)
    won = [d for d in all_deals if d["stage"] == "won"]
    months_with_wins = {month_key(d["close_date"]) for d in won} & set(last_12_months(TODAY))
    assert len(months_with_wins) >= 9
    assert all(d["close_date"] <= TODAY for d in won)
    assert sum(1 for d in all_deals if rules.is_late(d["stage"], d["close_date"], TODAY)) >= 3
    recent = lambda stage: sum(1 for d in all_deals if d["stage"] == stage and rules.in_closed_window(d["close_date"], TODAY))
    assert recent("won") >= 3 and recent("lost") >= 2
    acts = rows(seeded, activities)
    overdue = [a for a in acts if rules.follow_up_state(a["follow_up_date"], a["done"], TODAY) == "overdue"]
    upcoming = [a for a in acts if a["follow_up_date"] and not a["done"] and TODAY <= a["follow_up_date"] <= TODAY + timedelta(days=7)]
    assert len(overdue) >= 4 and len(upcoming) >= 4


def test_nothing_happens_in_the_future(seeded):
    from conftest import NOW

    assert all(a["happened_at"] <= NOW for a in rows(seeded, activities))
    assert all(d["created_at"] <= NOW for d in rows(seeded, deals))


def test_every_deal_past_new_has_a_chain_ending_at_its_stage(seeded):
    by_deal: dict[int, list[dict]] = {}
    for a in rows(seeded, activities):
        if a["type"] == "stage_change":
            by_deal.setdefault(a["deal_id"], []).append(a)
    for d in rows(seeded, deals):
        chain = sorted(by_deal.get(d["id"], []), key=lambda a: (a["happened_at"], a["id"]))
        if d["stage"] == "new":
            assert chain == []
            continue
        assert chain, d
        assert chain[0]["from_stage"] == "new"
        assert chain[-1]["to_stage"] == d["stage"]
        for before, after in zip(chain, chain[1:]):
            assert before["to_stage"] == after["from_stage"]
        assert all(a["description"] == rules.stage_change_text(a["from_stage"], a["to_stage"]) for a in chain)


def test_positions_are_numbered_in_every_column(seeded):
    by_stage = Counter()
    positions: dict[str, list[int]] = {}
    for d in rows(seeded, deals):
        by_stage[d["stage"]] += 1
        positions.setdefault(d["stage"], []).append(d["position"])
    for stage, pos in positions.items():
        assert sorted(pos) == list(range(by_stage[stage]))


def test_deals_link_to_real_records(seeded):
    org_ids = {o["id"] for o in rows(seeded, organizations)}
    contact_ids = {c["id"] for c in rows(seeded, contacts)}
    for d in rows(seeded, deals):
        assert d["organization_id"] in org_ids
        assert d["contact_id"] is None or d["contact_id"] in contact_ids
        assert 25_000 <= d["value"] <= 2_500_000
    assert all(o["id"] for o in rows(seeded, organizations))


def dump(engine):
    with engine.connect() as conn:
        return {t.name: [tuple(r) for r in conn.execute(select(t).order_by(t.c.id))] for t in (organizations, contacts, deals, activities)}


def test_two_runs_give_the_same_data(tmp_path):
    engines = [db.make_engine(tmp_path / f"{n}.db") for n in "ab"]
    for e in engines:
        seed.seed_sample(e)
    assert dump(engines[0]) == dump(engines[1])


def test_seeding_replaces_changed_data_and_recovers_an_old_schema(tmp_path):
    engine = db.make_engine(tmp_path / "x.db")
    with engine.begin() as conn:
        conn.exec_driver_sql("CREATE TABLE deals (id INTEGER PRIMARY KEY, old_column TEXT)")  # an older schema
    seed.seed_sample(engine)
    with engine.connect() as conn:
        assert repo.counts(conn)["deals"] == 60


def test_seeding_while_another_connection_is_open(tmp_path):
    path = tmp_path / "x.db"
    engine = db.make_engine(path)
    seed.seed_sample(engine)
    other = db.make_engine(path)
    reader = other.connect()
    reader.execute(select(deals.c.id)).all()  # an open connection holding a read snapshot
    seed.seed_sample(engine)
    reader.close()
    with other.connect() as conn:
        assert repo.counts(conn)["deals"] == 60


def test_new_database_seeds_on_first_start_and_an_existing_one_does_not(db_path):
    settings = Settings(db_path=db_path, test_mode=False, seed_new_db=True)
    with TestClient(create_app(settings)) as c:
        assert len(c.get("/api/deals").json()) == 60
        deal = c.get("/api/deals").json()[0]
        assert c.delete(f"/api/deals/{deal['id']}").status_code == 204
    with TestClient(create_app(settings)) as c:  # a restart of an existing database
        assert len(c.get("/api/deals").json()) == 59


def test_large_dataset_sizes(tmp_path):
    engine = db.make_engine(tmp_path / "large.db")
    seed.seed_large(engine)
    with engine.connect() as conn:
        c = repo.counts(conn)
    assert (c["organizations"], c["contacts"], c["deals"], c["activities"]) == (500, 2000, 1000, 10000)
