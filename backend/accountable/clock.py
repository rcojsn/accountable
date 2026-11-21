"""The only place the app reads the date or time (REQ-19), so tests can fix it."""

from datetime import date, datetime

_fixed: datetime | None = None


def set_fixed(value: datetime | None) -> None:
    global _fixed
    _fixed = value


def now() -> datetime:
    return (_fixed or datetime.now()).replace(microsecond=0)


def today() -> date:
    return now().date()
