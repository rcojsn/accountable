def test_create_get_update(client, api):
    org = api.org("Acme", industry="Mining", website="acme.co.za", notes="Big")
    assert org["contact_count"] == 0 and org["open_deal_count"] == 0 and org["open_value"] == 0
    r = client.get(f"/api/organizations/{org['id']}")
    assert r.json()["name"] == "Acme" and r.json()["contacts"] == [] and r.json()["deals"] == []
    r = client.patch(f"/api/organizations/{org['id']}", json={"industry": "Retail"})
    assert r.json()["industry"] == "Retail" and r.json()["name"] == "Acme"


def test_list_counts(client, api):
    org = api.org("Acme")
    api.org("Beta")
    api.contact("A", organization_id=org["id"])
    api.contact("B", organization_id=org["id"])
    api.deal(org["id"], stage="new", value=1000)
    api.deal(org["id"], stage="negotiation", value=2000)
    api.deal(org["id"], stage="won", value=5000)
    api.deal(org["id"], stage="lost", value=7000)
    rows = {o["name"]: o for o in client.get("/api/organizations").json()}
    assert rows["Acme"]["contact_count"] == 2
    assert rows["Acme"]["open_deal_count"] == 2
    assert rows["Acme"]["open_value"] == 3000
    assert rows["Beta"]["open_value"] == 0


def test_requires_name(client):
    assert client.post("/api/organizations", json={}).status_code == 422
    assert client.post("/api/organizations", json={"name": "   "}).status_code == 422


def test_patch_cannot_blank_name(client, api):
    org = api.org()
    assert client.patch(f"/api/organizations/{org['id']}", json={"name": ""}).status_code == 422
    assert client.patch(f"/api/organizations/{org['id']}", json={"name": None}).status_code == 422


def test_missing_is_404(client):
    assert client.get("/api/organizations/999").status_code == 404
    assert client.patch("/api/organizations/999", json={"name": "x"}).status_code == 404
    assert client.delete("/api/organizations/999").status_code == 404
    assert client.get("/api/organizations/999/delete-impact").status_code == 404
