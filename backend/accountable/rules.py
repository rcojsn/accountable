"""Business rules shared by routers, seed and tests. Mirrored in frontend/src/lib/rules.ts."""

from datetime import date, timedelta

STAGES = ["new", "qualified", "proposal", "negotiation", "won", "lost"]
OPEN_STAGES = ["new", "qualified", "proposal", "negotiation"]
STAGE_NAMES = {
    "new": "New", "qualified": "Qualified", "proposal": "Proposal",
    "negotiation": "Negotiation", "won": "Won", "lost": "Lost",
}
PROBABILITY = {"new": 10, "qualified": 25, "proposal": 50, "negotiation": 75, "won": 100, "lost": 0}  # REQ-14
CLOSED_WINDOW_DAYS = 30  # REQ-61


def is_open(stage: str) -> bool:
    return stage in OPEN_STAGES


def is_late(stage: str, close_date: date | None, today: date) -> bool:  # REQ-17
    return is_open(stage) and close_date is not None and close_date < today


def follow_up_state(follow_up_date: date | None, done: bool, today: date) -> str:  # REQ-18
    """'none', 'done', 'overdue' or 'due'."""
    if follow_up_date is None:
        return "none"
    if done:
        return "done"
    return "overdue" if follow_up_date < today else "due"


def expected_revenue(value: int, probability: int) -> int:  # REQ-20
    return (value * probability + 50) // 100


def in_closed_window(close_date: date | None, today: date) -> bool:  # REQ-61
    if close_date is None:
        return False
    return today - timedelta(days=CLOSED_WINDOW_DAYS - 1) <= close_date <= today


def stage_change_values(new_stage: str, provided: set[str], today: date) -> dict:
    """What a stage change sets on the deal itself (REQ-15, concern 11)."""
    values: dict = {"stage": new_stage}
    if "probability" not in provided:
        values["probability"] = PROBABILITY[new_stage]
    if new_stage in ("won", "lost") and "close_date" not in provided:
        values["close_date"] = today
    return values


def stage_change_text(old: str, new: str) -> str:
    return f"Moved from {STAGE_NAMES[old]} to {STAGE_NAMES[new]}"
