import pytest


def test_default_status_lead(api):
    c = api.contact("Thandi")
    assert c["status"] == "lead" and c["organization_id"] is None and c["organization_name"] is None


@pytest.mark.parametrize("body", [{}, {"name": ""}, {"name": "A", "status": "vip"}, {"name": "A", "email": "nope"}, {"name": "A", "email": "a@b"}])
def test_invalid(client, body):
    assert client.post("/api/contacts", json=body).status_code == 422


def test_valid_email_and_blank_optionals(client):
    r = client.post("/api/contacts", json={"name": "A", "email": "a@b.co.za", "phone": "", "job_title": ""})
    assert r.status_code == 201
    assert r.json()["phone"] is None


def test_unknown_organization_is_422(client):
    r = client.post("/api/contacts", json={"name": "A", "organization_id": 99})
    assert r.status_code == 422 and r.json()["detail"][0]["loc"] == ["body", "organization_id"]


def test_get_includes_organization_and_deals(client, api):
    org = api.org("Acme")
    c = api.contact("Thandi", organization_id=org["id"])
    d = api.deal(org["id"], contact_id=c["id"])
    api.deal(org["id"], name="Other")
    got = client.get(f"/api/contacts/{c['id']}").json()
    assert got["organization_name"] == "Acme"
    assert [x["id"] for x in got["deals"]] == [d["id"]]


def test_update_status_and_org(client, api):
    org = api.org()
    c = api.contact()
    r = client.patch(f"/api/contacts/{c['id']}", json={"status": "customer", "organization_id": org["id"]})
    assert r.json()["status"] == "customer" and r.json()["organization_name"] == "Acme"
    r = client.patch(f"/api/contacts/{c['id']}", json={"organization_id": None})
    assert r.json()["organization_id"] is None
    assert client.patch(f"/api/contacts/{c['id']}", json={"status": "bad"}).status_code == 422
