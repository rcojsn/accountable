from pathlib import Path

from sqlalchemy import (
    Boolean, CheckConstraint, Column, Date, DateTime, ForeignKey, Index, Integer,
    MetaData, String, Table, Text, create_engine, event,
)
from sqlalchemy.engine import Connection, Engine

from . import clock

metadata = MetaData()


def _stamps():
    return [
        Column("created_at", DateTime, nullable=False, default=clock.now),
        Column("updated_at", DateTime, nullable=False, default=clock.now, onupdate=clock.now),
    ]


organizations = Table(
    "organizations", metadata,
    Column("id", Integer, primary_key=True),
    Column("name", Text, nullable=False),
    Column("website", Text),
    Column("industry", Text),
    Column("notes", Text),
    *_stamps(),
)

contacts = Table(
    "contacts", metadata,
    Column("id", Integer, primary_key=True),
    Column("name", Text, nullable=False),
    Column("email", Text),
    Column("phone", Text),
    Column("job_title", Text),
    Column("organization_id", Integer, ForeignKey("organizations.id", ondelete="SET NULL")),
    Column("status", String(20), nullable=False, default="lead"),
    *_stamps(),
    CheckConstraint("status IN ('lead','qualified','customer')", name="ck_contacts_status"),
    Index("ix_contacts_organization_id", "organization_id"),
)

deals = Table(
    "deals", metadata,
    Column("id", Integer, primary_key=True),
    Column("name", Text, nullable=False),
    Column("organization_id", Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
    Column("contact_id", Integer, ForeignKey("contacts.id", ondelete="SET NULL")),
    Column("stage", String(20), nullable=False, default="new"),
    Column("value", Integer, nullable=False),
    Column("probability", Integer, nullable=False),
    Column("close_date", Date),
    Column("position", Integer, nullable=False, default=0),
    *_stamps(),
    CheckConstraint("value >= 0", name="ck_deals_value"),
    CheckConstraint("probability BETWEEN 0 AND 100", name="ck_deals_probability"),
    CheckConstraint("stage IN ('new','qualified','proposal','negotiation','won','lost')", name="ck_deals_stage"),
    Index("ix_deals_organization_id", "organization_id"),
    Index("ix_deals_contact_id", "contact_id"),
    Index("ix_deals_stage_position", "stage", "position"),
)

activities = Table(
    "activities", metadata,
    Column("id", Integer, primary_key=True),
    Column("type", String(20), nullable=False),
    Column("contact_id", Integer, ForeignKey("contacts.id", ondelete="CASCADE")),
    Column("deal_id", Integer, ForeignKey("deals.id", ondelete="CASCADE")),
    Column("description", Text, nullable=False),
    Column("happened_at", DateTime, nullable=False),
    Column("follow_up_date", Date),
    Column("done", Boolean, nullable=False, default=False),
    Column("from_stage", String(20)),
    Column("to_stage", String(20)),
    *_stamps(),
    CheckConstraint("type IN ('note','call','email','stage_change')", name="ck_activities_type"),
    CheckConstraint("(contact_id IS NOT NULL) + (deal_id IS NOT NULL) = 1", name="ck_activities_one_owner"),
    CheckConstraint("type <> 'stage_change' OR follow_up_date IS NULL", name="ck_activities_stage_change_follow_up"),
    Index("ix_activities_contact_id", "contact_id"),
    Index("ix_activities_deal_id", "deal_id"),
    Index("ix_activities_happened_at", "happened_at"),
    Index("ix_activities_follow_up_date", "follow_up_date"),
)


def make_engine(path: Path | str) -> Engine:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(f"sqlite:///{path.as_posix()}", connect_args={"timeout": 5, "isolation_level": None})

    @event.listens_for(engine, "connect")
    def _pragmas(dbapi_conn, _record):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA busy_timeout=5000")
        cur.close()

    @event.listens_for(engine, "begin")
    def _begin(conn):
        # Emit BEGIN ourselves so DDL is transactional too (SQLAlchemy docs recipe for pysqlite).
        conn.exec_driver_sql("BEGIN")

    return engine


def create_schema(bind: Engine | Connection) -> None:
    metadata.create_all(bind)


def reset_schema(bind: Engine | Connection) -> None:
    metadata.drop_all(bind)
    metadata.create_all(bind)
