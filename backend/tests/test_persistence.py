import os
import subprocess
import sys

from fastapi.testclient import TestClient

from accountable.config import Settings
from accountable.main import create_app


def app_for(path, seed=False):
    return create_app(Settings(db_path=path, test_mode=False, seed_new_db=seed))


def test_data_survives_a_restart(db_path):
    with TestClient(app_for(db_path)) as c:
        org = c.post("/api/organizations", json={"name": "Acme"}).json()
        deal = c.post("/api/deals", json={"name": "D", "organization_id": org["id"], "stage": "proposal", "value": 5000}).json()
        c.post("/api/activities", json={"type": "note", "description": "Kept", "deal_id": deal["id"], "happened_at": "2026-11-20T10:00:00"})
    with TestClient(app_for(db_path)) as c:
        assert [o["name"] for o in c.get("/api/organizations").json()] == ["Acme"]
        assert c.get(f"/api/deals/{deal['id']}").json()["stage"] == "proposal"
        assert [a["description"] for a in c.get(f"/api/deals/{deal['id']}/timeline").json()] == ["Kept"]


def test_seed_command_replaces_data_while_the_app_has_the_file_open(db_path):
    env = {**os.environ, "ACCOUNTABLE_DB": str(db_path)}
    with TestClient(app_for(db_path, seed=True)) as c:
        first = c.get("/api/organizations").json()[0]
        c.patch(f"/api/organizations/{first['id']}", json={"name": "Changed by hand"})
        c.post("/api/organizations", json={"name": "Extra"})
        result = subprocess.run(
            [sys.executable, "-m", "accountable.seed"], env=env, capture_output=True, text=True, timeout=120,
        )
        assert result.returncode == 0, result.stderr
        names = [o["name"] for o in c.get("/api/organizations").json()]
        assert "Changed by hand" not in names and "Extra" not in names
        assert len(names) == 15
        assert len(c.get("/api/deals").json()) == 60
