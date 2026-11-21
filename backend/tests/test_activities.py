def test_create_on_contact_and_deal(api):
    org = api.org()
    c = api.contact("Thandi")
    d = api.deal(org["id"], "Deal")
    a1 = api.activity(contact_id=c["id"], type="call")
    a2 = api.activity(deal_id=d["id"], type="email", follow_up_date="2026-11-28")
    assert a1["contact_name"] == "Thandi" and a1["deal_id"] is None and a1["done"] is False
    assert a2["deal_name"] == "Deal" and a2["follow_up_date"] == "2026-11-28"


def _body(**kw):
    return {"type": "note", "description": "x", "happened_at": "2026-11-20T10:00:00", **kw}


def test_validation(client, api):
    org = api.org()
    c = api.contact()
    d = api.deal(org["id"])
    cid, did = c["id"], d["id"]
    assert client.post("/api/activities", json=_body()).status_code == 422  # neither
    assert client.post("/api/activities", json=_body(contact_id=cid, deal_id=did)).status_code == 422  # both
    for missing in ("type", "description", "happened_at"):
        body = _body(contact_id=cid)
        del body[missing]
        assert client.post("/api/activities", json=body).status_code == 422
    assert client.post("/api/activities", json=_body(contact_id=cid, description="  ")).status_code == 422
    assert client.post("/api/activities", json=_body(contact_id=cid, type="meeting")).status_code == 422
    assert client.post("/api/activities", json=_body(contact_id=999)).status_code == 422
    assert client.post("/api/activities", json=_body(deal_id=999)).status_code == 422


def test_stage_change_cannot_be_created(client, api):
    c = api.contact()
    r = client.post("/api/activities", json=_body(contact_id=c["id"], type="stage_change"))
    assert r.status_code == 422


def test_stage_change_cannot_be_edited_but_can_be_deleted(client, api):
    org = api.org()
    d = api.deal(org["id"])
    client.patch(f"/api/deals/{d['id']}", json={"stage": "qualified"})
    entry = api.timeline("deals", d["id"])[0]
    assert client.patch(f"/api/activities/{entry['id']}", json={"description": "x"}).status_code == 409
    assert client.patch(f"/api/activities/{entry['id']}", json={"done": True}).status_code == 409
    assert client.delete(f"/api/activities/{entry['id']}").status_code == 204
    assert api.timeline("deals", d["id"]) == []


def test_edit_and_follow_up_done(client, api):
    c = api.contact()
    a = api.activity(contact_id=c["id"], follow_up_date="2026-11-25")
    r = client.patch(f"/api/activities/{a['id']}", json={"description": "Changed", "type": "call"}).json()
    assert r["description"] == "Changed" and r["type"] == "call"
    assert client.patch(f"/api/activities/{a['id']}", json={"done": True}).json()["done"] is True
    assert client.patch(f"/api/activities/{a['id']}", json={"done": False}).json()["done"] is False
    assert client.patch(f"/api/activities/{a['id']}", json={"follow_up_date": None}).json()["follow_up_date"] is None
    assert client.patch(f"/api/activities/{a['id']}", json={"description": ""}).status_code == 422
    assert client.patch(f"/api/activities/{a['id']}", json={"type": "stage_change"}).status_code == 422


def test_missing_404(client):
    assert client.get("/api/activities/9").status_code == 404
    assert client.patch("/api/activities/9", json={"done": True}).status_code == 404
    assert client.delete("/api/activities/9").status_code == 404
