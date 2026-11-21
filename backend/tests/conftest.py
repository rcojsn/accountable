from datetime import date, datetime

import pytest
from fastapi.testclient import TestClient

from accountable import clock
from accountable.config import Settings
from accountable.main import create_app

TODAY = date(2026, 11, 21)
NOW = datetime(2026, 11, 21, 12, 0, 0)


@pytest.fixture(autouse=True)
def fixed_clock():
    clock.set_fixed(NOW)
    yield
    clock.set_fixed(None)


@pytest.fixture
def db_path(tmp_path):
    return tmp_path / "test.db"


@pytest.fixture
def client(db_path):
    app = create_app(Settings(db_path=db_path, test_mode=True, seed_new_db=False))
    with TestClient(app) as c:
        yield c


class Api:
    """Small helpers that create records through the API."""

    def __init__(self, client):
        self.c = client

    def org(self, name="Acme", **kw):
        r = self.c.post("/api/organizations", json={"name": name, **kw})
        assert r.status_code == 201, r.text
        return r.json()

    def contact(self, name="Thandi", **kw):
        r = self.c.post("/api/contacts", json={"name": name, **kw})
        assert r.status_code == 201, r.text
        return r.json()

    def deal(self, org_id, name="Deal", stage="new", value=1000, **kw):
        r = self.c.post("/api/deals", json={"name": name, "organization_id": org_id, "stage": stage, "value": value, **kw})
        assert r.status_code == 201, r.text
        return r.json()

    def activity(self, **kw):
        body = {"type": "note", "description": "Hello", "happened_at": "2026-11-20T10:00:00", **kw}
        r = self.c.post("/api/activities", json=body)
        assert r.status_code == 201, r.text
        return r.json()

    def column(self, stage):
        deals = [d for d in self.c.get("/api/deals").json() if d["stage"] == stage]
        return [d["id"] for d in sorted(deals, key=lambda d: d["position"])]

    def positions(self, stage):
        deals = [d for d in self.c.get("/api/deals").json() if d["stage"] == stage]
        return sorted(d["position"] for d in deals)

    def timeline(self, kind, id_):
        return self.c.get(f"/api/{kind}/{id_}/timeline").json()


@pytest.fixture
def api(client):
    return Api(client)
