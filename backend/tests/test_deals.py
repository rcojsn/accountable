from datetime import date

import pytest

TODAY = date(2026, 11, 21).isoformat()


def test_new_deal_takes_stage_probability(api):
    org = api.org()
    for stage, p in [("new", 10), ("qualified", 25), ("proposal", 50), ("negotiation", 75), ("won", 100), ("lost", 0)]:
        assert api.deal(org["id"], stage=stage)["probability"] == p
    assert api.deal(org["id"], stage="new", probability=40)["probability"] == 40


@pytest.mark.parametrize("missing", ["name", "organization_id", "stage", "value"])
def test_required(client, api, missing):
    org = api.org()
    body = {"name": "D", "organization_id": org["id"], "stage": "new", "value": 10}
    del body[missing]
    assert client.post("/api/deals", json=body).status_code == 422


@pytest.mark.parametrize("bad", [{"value": -1}, {"value": 1_000_000_001}, {"probability": 101}, {"probability": -1}, {"stage": "maybe"}, {"organization_id": 999}, {"contact_id": 999}])
def test_invalid_values(client, api, bad):
    org = api.org()
    body = {"name": "D", "organization_id": org["id"], "stage": "new", "value": 10, **bad}
    assert client.post("/api/deals", json=body).status_code == 422


def test_new_deal_goes_to_top(api):
    org = api.org()
    a = api.deal(org["id"], "A")
    b = api.deal(org["id"], "B")
    c = api.deal(org["id"], "C")
    assert api.column("new") == [c["id"], b["id"], a["id"]]
    assert api.positions("new") == [0, 1, 2]


def test_stage_change_sets_probability_and_logs(client, api):
    org = api.org()
    d = api.deal(org["id"], stage="proposal")
    r = client.patch(f"/api/deals/{d['id']}", json={"stage": "negotiation"}).json()
    assert r["stage"] == "negotiation" and r["probability"] == 75
    tl = api.timeline("deals", d["id"])
    assert len(tl) == 1 and tl[0]["type"] == "stage_change"
    assert tl[0]["description"] == "Moved from Proposal to Negotiation"
    assert tl[0]["from_stage"] == "proposal" and tl[0]["to_stage"] == "negotiation"


@pytest.mark.parametrize("stage", ["won", "lost"])
def test_closing_sets_close_date_today(client, api, stage):
    org = api.org()
    d = api.deal(org["id"], close_date="2026-12-31")
    r = client.patch(f"/api/deals/{d['id']}", json={"stage": stage}).json()
    assert r["close_date"] == TODAY


def test_hand_set_values_win_in_same_edit(client, api):
    org = api.org()
    d = api.deal(org["id"])
    r = client.patch(f"/api/deals/{d['id']}", json={"stage": "won", "probability": 90, "close_date": "2026-11-01"}).json()
    assert r["probability"] == 90 and r["close_date"] == "2026-11-01"


def test_hand_set_probability_survives_other_edits_until_next_stage_change(client, api):
    org = api.org()
    d = api.deal(org["id"], stage="qualified")
    client.patch(f"/api/deals/{d['id']}", json={"probability": 60})
    r = client.patch(f"/api/deals/{d['id']}", json={"value": 5000, "name": "Renamed"}).json()
    assert r["probability"] == 60
    r = client.patch(f"/api/deals/{d['id']}", json={"stage": "proposal"}).json()
    assert r["probability"] == 50


def test_reopening_keeps_close_date(client, api):
    org = api.org()
    d = api.deal(org["id"])
    client.patch(f"/api/deals/{d['id']}", json={"stage": "won"})
    r = client.patch(f"/api/deals/{d['id']}", json={"stage": "negotiation"}).json()
    assert r["close_date"] == TODAY and r["probability"] == 75


def test_stage_change_never_touches_contact_status(client, api):
    org = api.org()
    c = api.contact(status="lead")
    d = api.deal(org["id"], contact_id=c["id"])
    client.patch(f"/api/deals/{d['id']}", json={"stage": "won"})
    assert client.get(f"/api/contacts/{c['id']}").json()["status"] == "lead"


def test_same_stage_patch_adds_no_entry(client, api):
    org = api.org()
    d = api.deal(org["id"], stage="proposal")
    client.patch(f"/api/deals/{d['id']}", json={"stage": "proposal", "value": 5})
    assert api.timeline("deals", d["id"]) == []


def test_patch_cannot_null_required(client, api):
    org = api.org()
    d = api.deal(org["id"])
    for body in ({"name": None}, {"value": None}, {"stage": None}, {"organization_id": None}, {"name": ""}, {"value": -5}):
        assert client.patch(f"/api/deals/{d['id']}", json=body).status_code == 422


def test_list_has_is_late_and_expected_revenue(client, api):
    org = api.org("Acme")
    c = api.contact("Thandi")
    late = api.deal(org["id"], "Late", stage="proposal", value=10000, close_date="2026-11-20", contact_id=c["id"])
    api.deal(org["id"], "Today", stage="proposal", close_date=TODAY)
    api.deal(org["id"], "Nodate", stage="proposal")
    api.deal(org["id"], "Old won", stage="won", close_date="2026-01-01")
    rows = {d["name"]: d for d in client.get("/api/deals").json()}
    assert rows["Late"]["is_late"] and rows["Late"]["expected_revenue"] == 5000
    assert rows["Late"]["organization_name"] == "Acme" and rows["Late"]["contact_name"] == "Thandi"
    assert not rows["Today"]["is_late"] and not rows["Nodate"]["is_late"] and not rows["Old won"]["is_late"]
    assert late["is_late"]


def test_missing_deal_404(client):
    for call in (client.get("/api/deals/9"), client.patch("/api/deals/9", json={}), client.delete("/api/deals/9"), client.get("/api/deals/9/timeline")):
        assert call.status_code == 404
