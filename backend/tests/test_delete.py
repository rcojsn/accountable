from sqlalchemy import func, select

from accountable.db import activities, contacts, deals, organizations


def count(client, table):
    with client.app.state.engine.connect() as conn:
        return conn.execute(select(func.count()).select_from(table)).scalar_one()


def test_foreign_keys_pragma_is_on(client):
    with client.app.state.engine.connect() as conn:
        assert conn.exec_driver_sql("PRAGMA foreign_keys").scalar() == 1


def test_delete_organization(client, api):
    org = api.org("Acme")
    keep_org = api.org("Keep")
    c = api.contact("Thandi", organization_id=org["id"])
    d1 = api.deal(org["id"], "D1", contact_id=c["id"])
    d2 = api.deal(org["id"], "D2")
    keep = api.deal(keep_org["id"], "Keep")
    api.activity(deal_id=d1["id"])
    api.activity(deal_id=d2["id"])
    api.activity(deal_id=keep["id"])
    api.activity(contact_id=c["id"])
    impact = client.get(f"/api/organizations/{org['id']}/delete-impact").json()
    assert impact == {"name": "Acme", "contacts": 1, "deals": 2, "activities": 2}
    assert client.delete(f"/api/organizations/{org['id']}").status_code == 204
    assert client.get(f"/api/organizations/{org['id']}").status_code == 404
    assert count(client, deals) == 1
    assert count(client, activities) == 2  # the kept deal's and the contact's own
    assert count(client, organizations) == 1
    assert client.get(f"/api/contacts/{c['id']}").json()["organization_id"] is None
    assert api.positions("new") == [0]


def test_delete_contact(client, api):
    org = api.org()
    c = api.contact("Thandi")
    d = api.deal(org["id"], "D", contact_id=c["id"])
    api.activity(contact_id=c["id"])
    api.activity(contact_id=c["id"])
    api.activity(deal_id=d["id"])
    impact = client.get(f"/api/contacts/{c['id']}/delete-impact").json()
    assert impact == {"name": "Thandi", "activities": 2, "deals": 1, "deal_activities": 1}
    assert client.delete(f"/api/contacts/{c['id']}").status_code == 204
    assert count(client, contacts) == 0
    assert client.get(f"/api/deals/{d['id']}").json()["contact_id"] is None
    assert count(client, activities) == 1
    assert len(api.timeline("deals", d["id"])) == 1


def test_delete_deal(client, api):
    org = api.org()
    d = api.deal(org["id"], "D")
    other = api.deal(org["id"], "Other")
    api.activity(deal_id=d["id"])
    client.patch(f"/api/deals/{d['id']}", json={"stage": "qualified"})  # adds a stage-change entry
    api.activity(deal_id=other["id"])
    impact = client.get(f"/api/deals/{d['id']}/delete-impact").json()
    assert impact == {"name": "D", "activities": 2}
    assert client.delete(f"/api/deals/{d['id']}").status_code == 204
    assert count(client, activities) == 1
    assert count(client, deals) == 1
    assert api.positions("new") == [0]
