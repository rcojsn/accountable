"""GET /api/dashboard: every dashboard figure in one response (REQ-71 to REQ-77)."""

from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.engine import Connection, Engine

from .. import clock, repo, rules
from ..db import activities, deals
from .common import get_engine

router = APIRouter(tags=["dashboard"])

FUNNEL_STAGES = ["new", "qualified", "proposal", "negotiation", "won"]
FOLLOW_UP_DAYS = 7  # concern 10
RECENT_LIMIT = 10


def month_start(today: date, months_back: int) -> date:
    index = today.year * 12 + (today.month - 1) - months_back
    return date(index // 12, index % 12 + 1, 1)


def _months(conn: Connection, today: date) -> list[dict]:
    """Revenue won, deals won and deals lost for each of the last 12 months, oldest first (REQ-72, REQ-73)."""
    starts = [month_start(today, k) for k in range(11, -1, -1)]
    buckets = {(s.year, s.month): {"month": f"{s.year}-{s.month:02d}", "revenue_won": 0, "deals_won": 0, "deals_lost": 0} for s in starts}
    stmt = select(deals.c.stage, deals.c.close_date, deals.c.value).where(
        deals.c.stage.in_(["won", "lost"]), deals.c.close_date >= starts[0], deals.c.close_date <= today
    )
    for stage, close, value in conn.execute(stmt):
        bucket = buckets.get((close.year, close.month))
        if bucket is None:
            continue
        if stage == "won":
            bucket["revenue_won"] += value
            bucket["deals_won"] += 1
        else:
            bucket["deals_lost"] += 1
    return list(buckets.values())


def _funnel(conn: Connection, today: date) -> list[dict]:
    """Value and deals that reached each stage, for deals created in the last 12 months (REQ-74, concern 5)."""
    since = datetime.combine(today - timedelta(days=365), time.min)
    in_window = deals.c.created_at >= since
    furthest: dict[int, int] = {}
    for deal_id, stage in conn.execute(select(deals.c.id, deals.c.stage).where(in_window)):
        # With no history a deal counts at its current stage (a lost one with none counts at New).
        furthest[deal_id] = FUNNEL_STAGES.index(stage) if stage in FUNNEL_STAGES else 0
    history = (
        select(activities.c.deal_id, activities.c.from_stage, activities.c.to_stage)
        .select_from(activities.join(deals, deals.c.id == activities.c.deal_id))
        .where(activities.c.type == "stage_change", in_window)
    )
    for deal_id, old, new in conn.execute(history):
        for stage in (old, new):
            if stage in FUNNEL_STAGES:
                furthest[deal_id] = max(furthest[deal_id], FUNNEL_STAGES.index(stage))
    values = {row.id: row.value for row in conn.execute(select(deals.c.id, deals.c.value).where(in_window))}
    out = []
    for i, stage in enumerate(FUNNEL_STAGES):
        reached = [d for d, f in furthest.items() if f >= i]
        out.append({"stage": stage, "deal_count": len(reached), "value": sum(values[d] for d in reached)})
    return out


def _follow_ups(conn: Connection, today: date) -> dict:
    base = repo.activity_select().where(activities.c.follow_up_date.is_not(None), activities.c.done.is_(False))
    order = (activities.c.follow_up_date, activities.c.happened_at, activities.c.id)
    horizon = today + timedelta(days=FOLLOW_UP_DAYS)
    groups = {
        "overdue": activities.c.follow_up_date < today,
        "today": activities.c.follow_up_date == today,
        "next_7_days": (activities.c.follow_up_date > today) & (activities.c.follow_up_date <= horizon),
    }
    out = {name: [dict(r) for r in conn.execute(base.where(cond).order_by(*order)).mappings()] for name, cond in groups.items()}
    later = base.where(activities.c.follow_up_date > horizon).with_only_columns(activities.c.id)
    out["later_count"] = len(conn.execute(later).all())
    return out


def build_dashboard(conn: Connection) -> dict:
    now, today = clock.now(), clock.today()
    all_deals = repo.list_deals(conn)
    open_deals = [d for d in all_deals if rules.is_open(d["stage"])]

    stages = []
    for stage in rules.OPEN_STAGES:
        in_stage = [d for d in open_deals if d["stage"] == stage]
        stages.append({
            "stage": stage,
            "probability": rules.PROBABILITY[stage],
            "deal_count": len(in_stage),
            "value": sum(d["value"] for d in in_stage),
            "expected_revenue": sum(d["expected_revenue"] for d in in_stage),
        })

    months = _months(conn, today)
    this_month = months[-1]
    follow_ups = _follow_ups(conn, today)

    recent = (
        repo.activity_select().where(activities.c.happened_at <= now).order_by(*repo.activity_order()).limit(RECENT_LIMIT)
    )
    return {
        "today": today.isoformat(),
        "headline": {
            "open_value": sum(d["value"] for d in open_deals),
            "open_deal_count": len(open_deals),
            "expected_revenue": sum(d["expected_revenue"] for d in open_deals),
            "won_this_month_revenue": this_month["revenue_won"],
            "won_this_month_count": this_month["deals_won"],
            "late_deals": sum(1 for d in open_deals if d["is_late"]),
            "overdue_follow_ups": len(follow_ups["overdue"]),
            "due_today_follow_ups": len(follow_ups["today"]),
        },
        "months": months,
        "twelve_months": {
            "revenue_won": sum(m["revenue_won"] for m in months),
            "deals_won": sum(m["deals_won"] for m in months),
            "deals_lost": sum(m["deals_lost"] for m in months),
        },
        "funnel": _funnel(conn, today),
        "stages": stages,
        "follow_ups": follow_ups,
        "recent_activity": [dict(r) for r in conn.execute(recent).mappings()],
    }


@router.get("/dashboard")
def dashboard(engine: Engine = Depends(get_engine)):
    with engine.connect() as conn:
        return build_dashboard(conn)


