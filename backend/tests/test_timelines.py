def test_newest_first_by_happened_at(api):
    c = api.contact()
    api.activity(contact_id=c["id"], description="middle", happened_at="2026-11-10T09:00:00")
    api.activity(contact_id=c["id"], description="newest", happened_at="2026-11-20T09:00:00")
    api.activity(contact_id=c["id"], description="oldest", happened_at="2026-11-01T09:00:00")
    assert [a["description"] for a in api.timeline("contacts", c["id"])] == ["newest", "middle", "oldest"]


def test_contact_timeline_includes_their_deals_only(api):
    org = api.org()
    c = api.contact("Thandi")
    other = api.contact("Other")
    mine = api.deal(org["id"], "Mine", contact_id=c["id"])
    theirs = api.deal(org["id"], "Theirs", contact_id=other["id"])
    api.activity(contact_id=c["id"], description="own", happened_at="2026-11-01T09:00:00")
    api.activity(deal_id=mine["id"], description="on mine", happened_at="2026-11-02T09:00:00")
    api.activity(deal_id=theirs["id"], description="on theirs", happened_at="2026-11-03T09:00:00")
    tl = api.timeline("contacts", c["id"])
    assert [a["description"] for a in tl] == ["on mine", "own"]
    assert tl[0]["deal_id"] == mine["id"] and tl[0]["deal_name"] == "Mine"
    assert tl[1]["deal_id"] is None


def test_changing_main_contact_moves_history(client, api):
    org = api.org()
    old = api.contact("Old")
    new = api.contact("New")
    d = api.deal(org["id"], "D", contact_id=old["id"])
    api.activity(deal_id=d["id"], description="history")
    assert len(api.timeline("contacts", old["id"])) == 1
    client.patch(f"/api/deals/{d['id']}", json={"contact_id": new["id"]})
    assert api.timeline("contacts", old["id"]) == []
    assert [a["description"] for a in api.timeline("contacts", new["id"])] == ["history"]


def test_stage_changes_show_on_deal_and_main_contact(client, api):
    org = api.org()
    c = api.contact()
    d = api.deal(org["id"], contact_id=c["id"])
    client.patch(f"/api/deals/{d['id']}", json={"stage": "qualified"})
    assert api.timeline("deals", d["id"])[0]["type"] == "stage_change"
    assert api.timeline("contacts", c["id"])[0]["type"] == "stage_change"


def test_missing_contact_404(client):
    assert client.get("/api/contacts/9/timeline").status_code == 404
