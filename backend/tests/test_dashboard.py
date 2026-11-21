from datetime import datetime

from sqlalchemy import update

from accountable import clock
from accountable.db import deals


def dash(client):
    r = client.get("/api/dashboard")
    assert r.status_code == 200
    return r.json()


def set_created(client, deal_id, when):
    with client.app.state.engine.begin() as conn:
        conn.execute(update(deals).where(deals.c.id == deal_id).values(created_at=when))


def test_empty_database(client):
    d = dash(client)
    assert len(d["months"]) == 12 and d["months"][-1]["month"] == "2026-11" and d["months"][0]["month"] == "2025-12"
    assert d["headline"] == {
        "open_value": 0, "open_deal_count": 0, "expected_revenue": 0, "won_this_month_revenue": 0,
        "won_this_month_count": 0, "late_deals": 0, "overdue_follow_ups": 0, "due_today_follow_ups": 0,
    }
    assert [f["deal_count"] for f in d["funnel"]] == [0] * 5
    assert d["recent_activity"] == [] and d["follow_ups"]["later_count"] == 0


def hand_made(api):
    org = api.org("Acme")
    api.deal(org["id"], "d1", stage="new", value=100_000, close_date="2026-12-01")
    api.deal(org["id"], "d2", stage="qualified", value=200_000, close_date="2026-11-01")  # late
    api.deal(org["id"], "d3", stage="proposal", value=300_000)
    api.deal(org["id"], "d4", stage="negotiation", value=400_000, close_date="2026-11-20")  # late
    for name, value, close in [
        ("w1", 50_000, "2026-11-01"), ("w2", 70_000, "2026-11-21"), ("w3", 30_000, "2026-10-31"),
        ("w4", 10_000, "2025-12-31"), ("w5", 99_000, "2025-11-30"), ("w6", 5_000, "2026-01-01"),
    ]:
        api.deal(org["id"], name, stage="won", value=value, close_date=close)
    for name, close in [("l1", "2026-10-15"), ("l2", "2026-11-30"), ("l3", "2026-11-05")]:
        api.deal(org["id"], name, stage="lost", value=1_000, close_date=close)
    return org


def test_headline_figures(client, api):
    hand_made(api)
    h = dash(client)["headline"]
    assert h["open_value"] == 1_000_000 and h["open_deal_count"] == 4
    assert h["expected_revenue"] == 10_000 + 50_000 + 150_000 + 300_000
    assert h["won_this_month_revenue"] == 120_000 and h["won_this_month_count"] == 2
    assert h["late_deals"] == 2


def test_twelve_months_include_year_and_month_boundaries(client, api):
    hand_made(api)
    d = dash(client)
    by_month = {m["month"]: m for m in d["months"]}
    assert list(by_month) == [f"2025-{m}" for m in (12,)] + [f"2026-{m:02d}" for m in range(1, 12)]
    assert by_month["2025-12"]["revenue_won"] == 10_000  # won on 31 Dec 2025
    assert by_month["2026-01"]["revenue_won"] == 5_000  # won on 1 Jan 2026
    assert by_month["2026-10"]["revenue_won"] == 30_000  # won on 31 Oct
    assert by_month["2026-11"] == {"month": "2026-11", "revenue_won": 120_000, "deals_won": 2, "deals_lost": 1}
    assert by_month["2026-10"]["deals_lost"] == 1
    assert sum(m["revenue_won"] for m in d["months"]) == 165_000  # 30 Nov 2025 (99,000) is outside the window
    assert d["twelve_months"] == {"revenue_won": 165_000, "deals_won": 5, "deals_lost": 2}  # the lost deal dated in the future is excluded


def test_window_across_new_year(client, api):
    org = api.org()
    for name, close in [("a", "2026-01-31"), ("b", "2026-02-01"), ("c", "2027-01-01")]:
        api.deal(org["id"], name, stage="won", value=1_000, close_date=close)
    clock.set_fixed(datetime(2027, 1, 1, 0, 30))
    d = dash(client)
    assert d["months"][0]["month"] == "2026-02" and d["months"][-1]["month"] == "2027-01"
    assert d["months"][0]["deals_won"] == 1 and d["months"][-1]["deals_won"] == 1
    assert d["headline"]["won_this_month_count"] == 1
    assert d["twelve_months"]["deals_won"] == 2


def test_funnel_by_furthest_stage_reached(client, api):
    org = api.org()

    def walk(deal, *stages):
        for s in stages:
            assert client.patch(f"/api/deals/{deal['id']}", json={"stage": s}).status_code == 200

    f1 = api.deal(org["id"], "f1", stage="new", value=100)
    walk(f1, "qualified", "proposal", "negotiation")
    f2 = api.deal(org["id"], "f2", stage="new", value=200)
    walk(f2, "qualified", "proposal", "negotiation", "won")
    f3 = api.deal(org["id"], "f3", stage="new", value=400)
    walk(f3, "qualified", "proposal", "lost")
    api.deal(org["id"], "f4", stage="proposal", value=800)  # no history: counts at its current stage
    f5 = api.deal(org["id"], "f5", stage="won", value=999)  # created long ago: left out
    set_created(client, f5["id"], datetime(2024, 1, 1))
    api.deal(org["id"], "f6", stage="lost", value=1600)  # lost with no history: counts at New only
    funnel = {f["stage"]: (f["deal_count"], f["value"]) for f in dash(client)["funnel"]}
    assert funnel == {
        "new": (5, 100 + 200 + 400 + 800 + 1600),
        "qualified": (4, 100 + 200 + 400 + 800),
        "proposal": (4, 100 + 200 + 400 + 800),
        "negotiation": (2, 300),
        "won": (1, 200),
    }


def test_open_stage_totals(client, api):
    hand_made(api)
    stages = {s["stage"]: s for s in dash(client)["stages"]}
    assert list(stages) == ["new", "qualified", "proposal", "negotiation"]
    assert stages["qualified"] == {"stage": "qualified", "probability": 25, "deal_count": 1, "value": 200_000, "expected_revenue": 50_000}
    assert stages["negotiation"]["expected_revenue"] == 300_000


def test_follow_up_groups(client, api):
    c = api.contact("Thandi")
    org = api.org()
    d = api.deal(org["id"], "Deal")
    api.activity(contact_id=c["id"], description="overdue a", follow_up_date="2026-11-01")
    api.activity(deal_id=d["id"], description="overdue b", follow_up_date="2026-11-20")
    api.activity(contact_id=c["id"], description="today", follow_up_date="2026-11-21")
    api.activity(contact_id=c["id"], description="tomorrow", follow_up_date="2026-11-22")
    api.activity(contact_id=c["id"], description="day 7", follow_up_date="2026-11-28")
    api.activity(contact_id=c["id"], description="day 8", follow_up_date="2026-11-29")
    api.activity(contact_id=c["id"], description="much later", follow_up_date="2027-02-01")
    done = api.activity(contact_id=c["id"], description="finished", follow_up_date="2026-11-10")
    client.patch(f"/api/activities/{done['id']}", json={"done": True})
    f = dash(client)["follow_ups"]
    assert [a["description"] for a in f["overdue"]] == ["overdue a", "overdue b"]
    assert f["overdue"][1]["deal_name"] == "Deal" and f["overdue"][0]["contact_name"] == "Thandi"
    assert [a["description"] for a in f["today"]] == ["today"]
    assert [a["description"] for a in f["next_7_days"]] == ["tomorrow", "day 7"]
    assert f["later_count"] == 2
    h = dash(client)["headline"]
    assert h["overdue_follow_ups"] == 2 and h["due_today_follow_ups"] == 1


def test_recent_activity_excludes_the_future_and_caps_at_ten(client, api):
    c = api.contact()
    for i in range(12):
        api.activity(contact_id=c["id"], description=f"n{i}", happened_at=f"2026-11-{i + 1:02d}T09:00:00")
    api.activity(contact_id=c["id"], description="future", happened_at="2026-11-25T09:00:00")
    api.activity(contact_id=c["id"], description="just now", happened_at="2026-11-21T12:00:00")
    recent = dash(client)["recent_activity"]
    assert len(recent) == 10
    assert recent[0]["description"] == "just now" and recent[1]["description"] == "n11"
    assert "future" not in [a["description"] for a in recent]


def test_recent_activity_includes_stage_changes(client, api):
    org = api.org()
    d = api.deal(org["id"], "Big")
    client.patch(f"/api/deals/{d['id']}", json={"stage": "qualified"})
    first = dash(client)["recent_activity"][0]
    assert first["type"] == "stage_change" and first["deal_name"] == "Big" and first["to_stage"] == "qualified"


def test_figures_follow_changes_elsewhere(client, api):
    hand_made(api)
    before = dash(client)["headline"]
    d3 = next(d for d in client.get("/api/deals").json() if d["name"] == "d3")
    client.post(f"/api/deals/{d3['id']}/move", json={"stage": "won", "before_id": None})
    after = dash(client)["headline"]
    assert after["open_value"] == before["open_value"] - 300_000 and after["open_deal_count"] == 3
    assert after["won_this_month_revenue"] == before["won_this_month_revenue"] + 300_000
    assert after["won_this_month_count"] == 3
    c = api.contact()
    a = api.activity(contact_id=c["id"], follow_up_date="2026-11-21")
    assert dash(client)["headline"]["due_today_follow_ups"] == 1
    client.patch(f"/api/activities/{a['id']}", json={"done": True})
    assert dash(client)["headline"]["due_today_follow_ups"] == 0
