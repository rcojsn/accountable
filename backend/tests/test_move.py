from datetime import date

import pytest

TODAY = date(2026, 11, 21).isoformat()


def move(client, deal_id, stage, before_id=None):
    return client.post(f"/api/deals/{deal_id}/move", json={"stage": stage, "before_id": before_id})


@pytest.fixture
def board(api):
    """New: [a, b, c]; Qualified: [x, y, z] (top to bottom)."""
    org = api.org()
    ids = {}
    for stage, names in (("new", "cba"), ("qualified", "zyx")):
        for n in names:  # the last one created ends on top
            ids[n] = api.deal(org["id"], n, stage=stage)["id"]
    assert api.column("new") == [ids["a"], ids["b"], ids["c"]]
    assert api.column("qualified") == [ids["x"], ids["y"], ids["z"]]
    return ids


def test_reorder_within_column(client, api, board):
    r = move(client, board["a"], "new", board["c"])  # [a, b, c] -> [b, a, c]
    assert r.status_code == 200
    assert api.column("new") == [board["b"], board["a"], board["c"]]
    move(client, board["a"], "new", None)  # to the end
    assert api.column("new") == [board["b"], board["c"], board["a"]]
    move(client, board["a"], "new", board["b"])  # to the top
    assert api.column("new") == [board["a"], board["b"], board["c"]]
    assert api.positions("new") == [0, 1, 2]
    assert api.timeline("deals", board["a"]) == []  # no stage entry for a reorder


def test_move_to_other_column_top_middle_end(client, api, board):
    move(client, board["a"], "qualified", board["x"])  # top
    assert api.column("qualified") == [board["a"], board["x"], board["y"], board["z"]]
    move(client, board["b"], "qualified", board["y"])  # middle
    assert api.column("qualified") == [board["a"], board["x"], board["b"], board["y"], board["z"]]
    move(client, board["c"], "qualified", None)  # end
    assert api.column("qualified") == [board["a"], board["x"], board["b"], board["y"], board["z"], board["c"]]
    assert api.column("new") == []
    assert api.positions("qualified") == [0, 1, 2, 3, 4, 5]


def test_source_column_renumbered(client, api, board):
    move(client, board["a"], "qualified", None)  # a was first in New
    assert api.column("new") == [board["b"], board["c"]]
    assert api.positions("new") == [0, 1]


def test_invalid_requests_rejected(client, api, board):
    r = move(client, board["a"], "qualified", board["b"])  # b is in New, not Qualified
    assert r.status_code == 409
    assert api.column("new") == [board["a"], board["b"], board["c"]]
    assert move(client, board["a"], "new", board["a"]).status_code == 409
    assert move(client, board["a"], "new", 9999).status_code == 409
    assert move(client, 9999, "new", None).status_code == 404
    assert client.post(f"/api/deals/{board['a']}/move", json={"stage": "nope"}).status_code == 422


def test_move_changes_stage_probability_and_adds_entry(client, api, board):
    r = move(client, board["a"], "qualified", board["x"]).json()
    assert r["stage"] == "qualified" and r["probability"] == 25
    tl = api.timeline("deals", board["a"])
    assert [t["description"] for t in tl] == ["Moved from New to Qualified"]


@pytest.mark.parametrize("stage", ["won", "lost"])
def test_move_to_closed_sets_today(client, api, board, stage):
    r = move(client, board["a"], stage, None).json()
    assert r["close_date"] == TODAY and r["probability"] == (100 if stage == "won" else 0)


def test_same_place_changes_nothing(client, api, board):
    before = client.get("/api/deals").json()
    move(client, board["b"], "new", board["c"])  # b is already right before c
    move(client, board["c"], "new", None)  # c is already last
    move(client, board["a"], "new", board["b"])  # a is already first
    assert client.get("/api/deals").json() == before
    for d in "abc":
        assert api.timeline("deals", board[d]) == []


def test_move_into_won_with_hidden_older_deals(client, api):
    org = api.org()
    # Won column, top to bottom: recent1, recent2, old1, old2. The old ones are hidden from the board.
    old2 = api.deal(org["id"], "old2", stage="won", close_date="2026-01-01")["id"]
    old1 = api.deal(org["id"], "old1", stage="won", close_date="2026-02-01")["id"]
    recent2 = api.deal(org["id"], "recent2", stage="won", close_date="2026-11-10")["id"]
    recent1 = api.deal(org["id"], "recent1", stage="won", close_date="2026-11-15")["id"]
    assert api.column("won") == [recent1, recent2, old1, old2]
    new = api.deal(org["id"], "mover", stage="new")["id"]
    move(client, new, "won", recent2)  # dropped between the two visible cards
    assert api.column("won") == [recent1, new, recent2, old1, old2]
    other = api.deal(org["id"], "other", stage="new")["id"]
    move(client, other, "won", old1)  # dropped below the last visible card: placed before the first hidden one
    assert api.column("won") == [recent1, new, recent2, other, old1, old2]
    assert api.positions("won") == list(range(6))
