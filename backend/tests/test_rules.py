from datetime import date

import pytest

from accountable import rules

TODAY = date(2026, 11, 21)


@pytest.mark.parametrize("stage,p", [("new", 10), ("qualified", 25), ("proposal", 50), ("negotiation", 75), ("won", 100), ("lost", 0)])
def test_probabilities(stage, p):
    assert rules.PROBABILITY[stage] == p


def test_stage_order():
    assert rules.STAGES == ["new", "qualified", "proposal", "negotiation", "won", "lost"]


@pytest.mark.parametrize("stage", rules.OPEN_STAGES)
def test_late_open_stage_past_date(stage):
    assert rules.is_late(stage, date(2026, 11, 20), TODAY)


@pytest.mark.parametrize("stage", rules.OPEN_STAGES)
def test_not_late_today_or_future_or_no_date(stage):
    assert not rules.is_late(stage, TODAY, TODAY)
    assert not rules.is_late(stage, date(2026, 12, 1), TODAY)
    assert not rules.is_late(stage, None, TODAY)


@pytest.mark.parametrize("stage", ["won", "lost"])
def test_closed_never_late(stage):
    assert not rules.is_late(stage, date(2020, 1, 1), TODAY)


def test_follow_up_states():
    assert rules.follow_up_state(None, False, TODAY) == "none"
    assert rules.follow_up_state(date(2026, 11, 20), False, TODAY) == "overdue"
    assert rules.follow_up_state(TODAY, False, TODAY) == "due"
    assert rules.follow_up_state(date(2026, 11, 28), False, TODAY) == "due"
    assert rules.follow_up_state(date(2026, 11, 1), True, TODAY) == "done"


def test_expected_revenue():
    assert rules.expected_revenue(100000, 25) == 25000
    assert rules.expected_revenue(0, 75) == 0
    assert rules.expected_revenue(1_000_000_000, 100) == 1_000_000_000
    assert rules.expected_revenue(10, 25) == 3  # 2.5 rounds up


def test_closed_window_edges():
    assert rules.in_closed_window(TODAY, TODAY)
    assert rules.in_closed_window(date(2026, 10, 23), TODAY)  # 29 days before
    assert not rules.in_closed_window(date(2026, 10, 22), TODAY)  # 30 days before
    assert not rules.in_closed_window(date(2026, 11, 22), TODAY)
    assert not rules.in_closed_window(None, TODAY)


def test_stage_change_values():
    assert rules.stage_change_values("won", set(), TODAY) == {"stage": "won", "probability": 100, "close_date": TODAY}
    assert rules.stage_change_values("proposal", set(), TODAY) == {"stage": "proposal", "probability": 50}
    assert rules.stage_change_values("won", {"probability", "close_date"}, TODAY) == {"stage": "won"}
