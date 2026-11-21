"""SQLAlchemy Core queries shared by the routers and the seed."""

from datetime import date

from sqlalchemy import and_, func, insert, literal, select, update
from sqlalchemy.engine import Connection

from . import clock, rules
from .db import activities, contacts, deals, organizations

OPEN = rules.OPEN_STAGES


# ---------------------------------------------------------------- organizations
def list_organizations(conn: Connection, org_id: int | None = None) -> list[dict]:
    contact_count = (
        select(func.count()).where(contacts.c.organization_id == organizations.c.id).scalar_subquery()
    )
    open_count = (
        select(func.count())
        .where(and_(deals.c.organization_id == organizations.c.id, deals.c.stage.in_(OPEN)))
        .scalar_subquery()
    )
    open_value = (
        select(func.coalesce(func.sum(deals.c.value), 0))
        .where(and_(deals.c.organization_id == organizations.c.id, deals.c.stage.in_(OPEN)))
        .scalar_subquery()
    )
    stmt = select(
        organizations,
        contact_count.label("contact_count"),
        open_count.label("open_deal_count"),
        open_value.label("open_value"),
    ).order_by(func.lower(organizations.c.name), organizations.c.id)
    if org_id is not None:
        stmt = stmt.where(organizations.c.id == org_id)
    return [dict(r) for r in conn.execute(stmt).mappings()]


def get_organization(conn: Connection, org_id: int) -> dict | None:
    rows = list_organizations(conn, org_id)
    if not rows:
        return None
    row = rows[0]
    row["contacts"] = list_contacts(conn, organization_id=org_id)
    row["deals"] = list_deals(conn, organization_id=org_id)
    return row


def organization_exists(conn: Connection, org_id: int) -> bool:
    return conn.execute(select(organizations.c.id).where(organizations.c.id == org_id)).first() is not None


def organization_delete_impact(conn: Connection, org_id: int) -> dict | None:
    org = conn.execute(select(organizations.c.name).where(organizations.c.id == org_id)).first()
    if org is None:
        return None
    deal_ids = select(deals.c.id).where(deals.c.organization_id == org_id)
    return {
        "name": org.name,
        "contacts": _count(conn, contacts, contacts.c.organization_id == org_id),
        "deals": _count(conn, deals, deals.c.organization_id == org_id),
        "activities": _count(conn, activities, activities.c.deal_id.in_(deal_ids)),
    }


# --------------------------------------------------------------------- contacts
def _contact_select():
    return select(contacts, organizations.c.name.label("organization_name")).select_from(
        contacts.outerjoin(organizations, organizations.c.id == contacts.c.organization_id)
    )


def list_contacts(conn: Connection, organization_id: int | None = None) -> list[dict]:
    stmt = _contact_select().order_by(func.lower(contacts.c.name), contacts.c.id)
    if organization_id is not None:
        stmt = stmt.where(contacts.c.organization_id == organization_id)
    return [dict(r) for r in conn.execute(stmt).mappings()]


def get_contact(conn: Connection, contact_id: int) -> dict | None:
    row = conn.execute(_contact_select().where(contacts.c.id == contact_id)).mappings().first()
    if row is None:
        return None
    out = dict(row)
    out["deals"] = list_deals(conn, contact_id=contact_id)
    return out


def contact_exists(conn: Connection, contact_id: int) -> bool:
    return conn.execute(select(contacts.c.id).where(contacts.c.id == contact_id)).first() is not None


def contact_delete_impact(conn: Connection, contact_id: int) -> dict | None:
    row = conn.execute(select(contacts.c.name).where(contacts.c.id == contact_id)).first()
    if row is None:
        return None
    deal_ids = select(deals.c.id).where(deals.c.contact_id == contact_id)
    return {
        "name": row.name,
        "activities": _count(conn, activities, activities.c.contact_id == contact_id),
        "deals": _count(conn, deals, deals.c.contact_id == contact_id),
        "deal_activities": _count(conn, activities, activities.c.deal_id.in_(deal_ids)),
    }


# ------------------------------------------------------------------------ deals
def _deal_select():
    return select(
        deals,
        organizations.c.name.label("organization_name"),
        contacts.c.name.label("contact_name"),
    ).select_from(
        deals.join(organizations, organizations.c.id == deals.c.organization_id).outerjoin(
            contacts, contacts.c.id == deals.c.contact_id
        )
    )


def _deal_out(row, today: date) -> dict:
    d = dict(row)
    d["expected_revenue"] = rules.expected_revenue(d["value"], d["probability"])
    d["is_late"] = rules.is_late(d["stage"], d["close_date"], today)
    return d


def list_deals(conn: Connection, organization_id: int | None = None, contact_id: int | None = None) -> list[dict]:
    today = clock.today()
    stmt = _deal_select().order_by(deals.c.position, deals.c.id)
    if organization_id is not None:
        stmt = stmt.where(deals.c.organization_id == organization_id)
    if contact_id is not None:
        stmt = stmt.where(deals.c.contact_id == contact_id)
    return [_deal_out(r, today) for r in conn.execute(stmt).mappings()]


def get_deal(conn: Connection, deal_id: int) -> dict | None:
    row = conn.execute(_deal_select().where(deals.c.id == deal_id)).mappings().first()
    return _deal_out(row, clock.today()) if row else None


def deal_delete_impact(conn: Connection, deal_id: int) -> dict | None:
    row = conn.execute(select(deals.c.name).where(deals.c.id == deal_id)).first()
    if row is None:
        return None
    return {"name": row.name, "activities": _count(conn, activities, activities.c.deal_id == deal_id)}


def column_ids(conn: Connection, stage: str, exclude: int | None = None) -> list[int]:
    stmt = select(deals.c.id).where(deals.c.stage == stage).order_by(deals.c.position, deals.c.id)
    return [r.id for r in conn.execute(stmt) if r.id != exclude]


def _renumber(conn: Connection, ids: list[int]) -> None:
    for pos, deal_id in enumerate(ids):
        conn.execute(
            update(deals)
            .where(and_(deals.c.id == deal_id, deals.c.position != pos))
            .values(position=pos)
            .execution_options(synchronize_session=False)
        )


def close_gap(conn: Connection, stage: str) -> None:
    _renumber(conn, column_ids(conn, stage))


def renumber_all(conn: Connection) -> None:
    for stage in rules.STAGES:
        close_gap(conn, stage)


def add_stage_change(conn: Connection, deal_id: int, old: str, new: str) -> None:
    conn.execute(
        insert(activities).values(
            type="stage_change", deal_id=deal_id, description=rules.stage_change_text(old, new),
            happened_at=clock.now(), done=False, from_stage=old, to_stage=new,
        )
    )


def place_deal(conn: Connection, deal_id: int, stage: str, before_id: int | None) -> None:
    """Put a deal in a column just before `before_id` (or at the end), renumbering both columns.

    Positions only; the caller applies stage-change rules. `before_id` must already be validated.
    """
    old_stage = conn.execute(select(deals.c.stage).where(deals.c.id == deal_id)).scalar_one()
    target = column_ids(conn, stage, exclude=deal_id)
    index = target.index(before_id) if before_id is not None else len(target)
    target.insert(index, deal_id)
    # Park the deal in its new column first so both renumbers see the final stage.
    conn.execute(update(deals).where(deals.c.id == deal_id).values(stage=stage))
    _renumber(conn, target)
    if old_stage != stage:
        _renumber(conn, column_ids(conn, old_stage))


def move_deal(conn: Connection, deal_id: int, stage: str, before_id: int | None) -> None:
    """Move a card (REQ-62). Raises ValueError with a message when the request is invalid."""
    current = conn.execute(select(deals).where(deals.c.id == deal_id)).mappings().first()
    if before_id is not None:
        if before_id == deal_id:
            raise ValueError("A card can't be placed before itself.")
        other = conn.execute(select(deals.c.stage).where(deals.c.id == before_id)).first()
        if other is None or other.stage != stage:
            raise ValueError("The card to place before isn't in that column.")
    old_stage = current["stage"]
    if old_stage == stage:
        ids = column_ids(conn, stage)
        without = [i for i in ids if i != deal_id]
        new_order = without[:]
        new_order.insert(without.index(before_id) if before_id is not None else len(without), deal_id)
        if new_order == ids:
            return
    place_deal(conn, deal_id, stage, before_id)
    if old_stage != stage:
        values = rules.stage_change_values(stage, set(), clock.today())
        values.pop("stage")
        conn.execute(update(deals).where(deals.c.id == deal_id).values(**values))
        add_stage_change(conn, deal_id, old_stage, stage)
    else:
        conn.execute(update(deals).where(deals.c.id == deal_id).values(updated_at=clock.now()))


# ------------------------------------------------------------------- activities
def activity_select():
    return select(
        activities,
        contacts.c.name.label("contact_name"),
        deals.c.name.label("deal_name"),
    ).select_from(
        activities.outerjoin(contacts, contacts.c.id == activities.c.contact_id).outerjoin(
            deals, deals.c.id == activities.c.deal_id
        )
    )


def activity_order():
    return (activities.c.happened_at.desc(), activities.c.id.desc())


def get_activity(conn: Connection, activity_id: int) -> dict | None:
    row = conn.execute(activity_select().where(activities.c.id == activity_id)).mappings().first()
    return dict(row) if row else None


def deal_timeline(conn: Connection, deal_id: int) -> list[dict]:
    stmt = activity_select().where(activities.c.deal_id == deal_id).order_by(*activity_order())
    return [dict(r) for r in conn.execute(stmt).mappings()]


def contact_timeline(conn: Connection, contact_id: int) -> list[dict]:
    """Own activities plus those of deals where the contact is the main contact (REQ-55)."""
    deal_ids = select(deals.c.id).where(deals.c.contact_id == contact_id)
    stmt = (
        activity_select()
        .where((activities.c.contact_id == contact_id) | (activities.c.deal_id.in_(deal_ids)))
        .order_by(*activity_order())
    )
    return [dict(r) for r in conn.execute(stmt).mappings()]


# ---------------------------------------------------------------------- helpers
def _count(conn: Connection, table, where) -> int:
    return conn.execute(select(func.count()).select_from(table).where(where)).scalar_one()


def counts(conn: Connection) -> dict:
    return {
        "organizations": _count(conn, organizations, literal(True)),
        "contacts": _count(conn, contacts, literal(True)),
        "deals": _count(conn, deals, literal(True)),
        "open_deals": _count(conn, deals, deals.c.stage.in_(OPEN)),
        "activities": _count(conn, activities, literal(True)),
    }

