"""Sample data (REQ-80 to REQ-83).

Run `python -m accountable.seed [--large]`, or `npm run seed`. All dates are relative to
`clock.today()`, and the random seed is fixed, so two runs on the same day give the same data.
"""

import calendar
import random
import sys
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from sqlalchemy import insert
from sqlalchemy.engine import Engine

from . import clock, db, rules, seed_data as sd
from .config import Settings
from .db import activities, contacts, deals, organizations

SEED = 42
OPEN_PATH = ["new", "qualified", "proposal", "negotiation"]
# Share of deals per stage; the counts for 60 deals come out at 10, 9, 8, 8, 17 and 8.
STAGE_SHARE = [("new", 0.17), ("qualified", 0.15), ("proposal", 0.13), ("negotiation", 0.13), ("won", 0.28), ("lost", 0.14)]


@dataclass(frozen=True)
class Size:
    organizations: int
    contacts: int
    deals: int
    activities: int  # in total, stage changes included


SAMPLE = Size(15, 40, 60, 200)
LARGE = Size(500, 2000, 1000, 10000)  # REQ-6


def _at(day: date, rng: random.Random, now: datetime, lo_hour: int = 8, hi_hour: int = 17) -> datetime:
    t = datetime.combine(day, time(rng.randint(lo_hour, hi_hour), rng.choice([0, 5, 10, 15, 20, 30, 40, 45, 50])))
    return min(t, now - timedelta(minutes=30))


def _month_start(today: date, months_back: int) -> date:
    index = today.year * 12 + (today.month - 1) - months_back
    return date(index // 12, index % 12 + 1, 1)


def _day_in_month(today: date, months_back: int, rng: random.Random) -> date:
    start = _month_start(today, months_back)
    last = today.day if months_back == 0 else calendar.monthrange(start.year, start.month)[1]
    return start + timedelta(days=rng.randint(0, last - 1))


def _stage_counts(n: int) -> dict[str, int]:
    counts = {stage: round(n * share) for stage, share in STAGE_SHARE}
    counts["new"] += n - sum(counts.values())
    return counts


def _phone(rng: random.Random) -> str:
    return f"0{rng.choice([60, 71, 72, 73, 74, 76, 78, 79, 81, 82, 83, 84])} {rng.randint(100, 999)} {rng.randint(1000, 9999)}"


def _slug(text: str) -> str:
    return "".join(c for c in text.lower() if c.isalnum())


def build(size: Size, now: datetime) -> dict[str, list[dict]]:
    """All rows for the four tables, with explicit ids."""
    rng = random.Random(SEED)
    today = now.date()

    # ------------------------------------------------------------ organizations
    org_rows = []
    names = [(n, i, w) for n, i, w in sd.ORGANIZATIONS]
    combos = [f"{p} {s}" for p in sd.ORG_PREFIXES for s in sd.ORG_SUFFIXES]
    rng.shuffle(combos)
    taken = {n for n, _, _ in names}
    for combo in combos:
        if len(names) >= size.organizations:
            break
        if combo not in taken:
            names.append((combo, rng.choice(sd.INDUSTRIES), f"{_slug(combo)}.example"))
    for i, (name, industry, website) in enumerate(names[: size.organizations], start=1):
        created = _at(today - timedelta(days=rng.randint(400, 700)), rng, now)
        org_rows.append({
            "id": i, "name": name, "industry": industry, "website": website,
            "notes": rng.choice([None, None, "Key account", "Pays on 30 days", "Prefers email", "Met at an industry expo"]),
            "created_at": created, "updated_at": created,
        })

    # ----------------------------------------------------------------- contacts
    n_lead, n_qual = round(size.contacts * 0.35), round(size.contacts * 0.30)
    statuses = ["lead"] * n_lead + ["qualified"] * n_qual
    statuses += ["customer"] * (size.contacts - len(statuses))
    rng.shuffle(statuses)
    pairs = [(f, l) for f in sd.FIRST_NAMES for l in sd.LAST_NAMES]
    rng.shuffle(pairs)
    contact_rows = []
    by_org: dict[int, list[int]] = {}
    for i in range(1, size.contacts + 1):
        first, last = pairs[(i - 1) % len(pairs)]
        if i <= len(org_rows):  # every organization has at least one contact
            org_id = i
        elif rng.random() < 0.08:
            org_id = None
        else:
            org_id = rng.randint(1, len(org_rows))
        org_site = org_rows[org_id - 1]["website"] if org_id else "example.com"
        created = _at(today - timedelta(days=rng.randint(30, 500)), rng, now)
        contact_rows.append({
            "id": i, "name": f"{first} {last}",
            "email": f"{_slug(first)}.{_slug(last)}@{org_site}" if rng.random() < 0.9 else None,
            "phone": _phone(rng) if rng.random() < 0.85 else None,
            "job_title": rng.choice(sd.JOB_TITLES) if rng.random() < 0.9 else None,
            "organization_id": org_id, "status": statuses[i - 1],
            "created_at": created, "updated_at": created,
        })
        if org_id:
            by_org.setdefault(org_id, []).append(i)

    # -------------------------------------------------------------------- deals
    counts = _stage_counts(size.deals)
    stage_plan: list[str] = []
    for stage, n in counts.items():
        stage_plan += [stage] * n
    rng.shuffle(stage_plan)

    open_idx = [i for i, s in enumerate(stage_plan) if s in OPEN_PATH]
    late_idx = set(rng.sample(open_idx, max(5, round(0.15 * len(open_idx)))))
    undated_idx = set(rng.sample([i for i in open_idx if i not in late_idx], max(2, round(0.05 * len(open_idx)))))

    def closed_dates(stage: str, n_recent: int) -> list[date]:
        idx = [i for i, s in enumerate(stage_plan) if s == stage]
        dates = [today - timedelta(days=rng.randint(0, 29)) for _ in range(n_recent)]  # REQ-81
        rest = len(idx) - n_recent
        if stage == "won":  # one in every month of the 12-month window, then the surplus
            order = list(range(11, -1, -1))
            dates += [_day_in_month(today, order[k % 12], rng) for k in range(rest)]
        else:
            dates += [_day_in_month(today, rng.randint(0, 11), rng) for _ in range(rest)]
        return dates

    close_for: dict[int, date] = {}
    for stage, share in (("won", 0.12), ("lost", 0.12)):
        idx = [i for i, s in enumerate(stage_plan) if s == stage]
        recent = min(len(idx), max(3 if stage == "won" else 2, round(share * len(idx))))
        for i, d in zip(idx, closed_dates(stage, recent)):
            close_for[i] = d

    deal_rows, change_rows = [], []
    for i, stage in enumerate(stage_plan):
        deal_id = i + 1
        org_id = rng.randint(1, len(org_rows))
        pool = by_org.get(org_id, [])
        contact_id = rng.choice(pool) if pool and rng.random() < 0.85 else None
        value = max(25_000, round(rng.lognormvariate(12.6, 0.9) / 5000) * 5000)
        value = min(value, 2_500_000)

        if stage in ("won", "lost"):
            close = close_for[i]
            end = _at(close, rng, now, 9, 16)
            created = end - timedelta(days=rng.randint(25, 90), hours=rng.randint(0, 5))
        else:
            if i in late_idx:
                close = today - timedelta(days=rng.randint(2, 45))
            elif i in undated_idx:
                close = None
            else:
                close = today + timedelta(days=rng.randint(3, 210))
            created = _at(today - timedelta(days=rng.randint(10, 160)), rng, now)
            end = created + (now - created) * rng.uniform(0.5, 0.95)

        probability = rules.PROBABILITY[stage]
        if stage in OPEN_PATH and rng.random() < 0.1:
            probability = min(95, max(5, probability + rng.choice([-10, -5, 5, 10])))

        deal_rows.append({
            "id": deal_id, "name": rng.choice(sd.DEAL_NAMES), "organization_id": org_id, "contact_id": contact_id,
            "stage": stage, "value": value, "probability": probability, "close_date": close, "position": 0,
            "created_at": created, "updated_at": end,
        })

        # REQ-82: a believable path to the current stage
        if stage == "won":
            path = OPEN_PATH + ["won"]
        elif stage == "lost":
            reached = rng.choice([0, 1, 1, 2, 2, 3])
            path = OPEN_PATH[: reached + 1] + ["lost"]
        else:
            path = OPEN_PATH[: OPEN_PATH.index(stage) + 1]
        for step in range(1, len(path)):
            when = created + (end - created) * step / (len(path) - 1)
            change_rows.append({
                "type": "stage_change", "contact_id": None, "deal_id": deal_id,
                "description": rules.stage_change_text(path[step - 1], path[step]),
                "happened_at": min(when.replace(microsecond=0), now), "follow_up_date": None, "done": False,
                "from_stage": path[step - 1], "to_stage": path[step],
            })

    # Board positions: closed columns newest first, open columns in a fixed shuffled order.
    for stage in rules.STAGES:
        column = [d for d in deal_rows if d["stage"] == stage]
        if stage in ("won", "lost"):
            column.sort(key=lambda d: (d["close_date"], d["id"]), reverse=True)
        else:
            rng.shuffle(column)
        for pos, d in enumerate(column):
            d["position"] = pos

    # --------------------------------------------------------------- activities
    n_regular = max(0, size.activities - len(change_rows))
    kinds = [("note", sd.NOTE_TEXTS), ("call", sd.CALL_TEXTS), ("email", sd.EMAIL_TEXTS)]
    owners = []  # (contact_id, deal_id, lo, hi, allows_follow_up)
    for _ in range(n_regular):
        if rng.random() < 0.55 and deal_rows:
            d = rng.choice(deal_rows)
            closed = d["stage"] in ("won", "lost")
            hi = d["updated_at"] if closed else now - timedelta(hours=1)
            owners.append((None, d["id"], d["created_at"], hi, not closed))
        else:
            c = rng.choice(contact_rows)
            owners.append((c["id"], None, max(c["created_at"], now - timedelta(days=200)), now - timedelta(hours=1), True))

    act_rows = []
    for contact_id, deal_id, lo, hi, _ok in owners:
        kind, texts = rng.choice(kinds)
        when = lo + (hi - lo) * rng.random()
        act_rows.append({
            "type": kind, "contact_id": contact_id, "deal_id": deal_id, "description": rng.choice(texts),
            "happened_at": min(when.replace(microsecond=0), now), "follow_up_date": None, "done": False,
            "from_stage": None, "to_stage": None,
        })

    # A few very recent entries, so the dashboard's recent activity is lively.
    for row, owner in list(zip(act_rows, owners))[: min(8, len(act_rows))]:
        row["happened_at"] = (now - timedelta(hours=rng.randint(1, 60), minutes=rng.randint(0, 59))).replace(microsecond=0)
        owner_lo = owner[2]
        row["happened_at"] = max(row["happened_at"], owner_lo)

    # REQ-81: overdue, today, soon and later follow-ups, plus some already done.
    eligible = [i for i, o in enumerate(owners) if o[4]]
    rng.shuffle(eligible)
    n = len(act_rows)
    plan = [
        ("overdue", max(5, round(0.06 * n))), ("today", max(2, round(0.03 * n))), ("soon", max(3, round(0.03 * n))),
        ("later", max(5, round(0.05 * n))), ("done", max(6, round(0.10 * n))),
    ]
    cursor = 0
    for kind, k in plan:
        for i in eligible[cursor: cursor + k]:
            row = act_rows[i]
            if kind == "overdue":
                due = today - timedelta(days=rng.randint(1, 21))
            elif kind == "today":
                due = today
            elif kind == "soon":
                due = today + timedelta(days=rng.randint(1, 7))
            elif kind == "later":
                due = today + timedelta(days=rng.randint(9, 60))
            else:
                due = today - timedelta(days=rng.randint(3, 60))
            row["follow_up_date"] = due
            row["done"] = kind == "done"
            row["description"] = rng.choice(sd.FOLLOW_UP_TEXTS)
            lo = owners[i][2]
            if row["happened_at"].date() > due:  # an entry can't be logged after its own follow-up date passed
                row["happened_at"] = max(lo, datetime.combine(due, time(9, 30)) - timedelta(days=rng.randint(1, 8)))
        cursor += k

    all_acts = change_rows + act_rows
    all_acts.sort(key=lambda a: (a["happened_at"], a["deal_id"] or 0, a["contact_id"] or 0, a["description"]))
    for i, a in enumerate(all_acts, start=1):
        a["id"] = i
        a["created_at"] = a["updated_at"] = a["happened_at"]

    return {"organizations": org_rows, "contacts": contact_rows, "deals": deal_rows, "activities": all_acts}


def _load(engine: Engine, size: Size) -> None:
    rows = build(size, clock.now())
    with engine.begin() as conn:  # one transaction for the whole reset
        db.reset_schema(conn)
        for table in (organizations, contacts, deals, activities):
            data = rows[table.name]
            for start in range(0, len(data), 1000):
                conn.execute(insert(table), data[start: start + 1000])


def seed_sample(engine: Engine) -> None:
    _load(engine, SAMPLE)


def seed_large(engine: Engine) -> None:
    _load(engine, LARGE)


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    settings = Settings.from_env()
    engine = db.make_engine(settings.db_path)
    large = "--large" in argv
    (seed_large if large else seed_sample)(engine)
    with engine.connect() as conn:
        from . import repo

        c = repo.counts(conn)
    engine.dispose()
    print(
        f"Seeded {settings.db_path} with {'large' if large else 'sample'} data: "
        f"{c['organizations']} organizations, {c['contacts']} contacts, {c['deals']} deals, {c['activities']} activities."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
