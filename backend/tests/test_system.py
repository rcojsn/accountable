from fastapi.testclient import TestClient

from accountable.config import Settings
from accountable.main import create_app


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_reset_endpoint_sizes(client):
    assert client.post("/api/test/reset?size=sample").status_code == 200
    assert len(client.get("/api/deals").json()) == 60
    assert client.post("/api/test/reset?size=empty").status_code == 200
    assert client.get("/api/deals").json() == []
    assert client.post("/api/test/reset?size=huge").status_code == 422


def test_reset_endpoint_is_only_mounted_in_test_mode(db_path):
    app = create_app(Settings(db_path=db_path, test_mode=False, seed_new_db=False))
    with TestClient(app) as c:
        assert c.post("/api/test/reset?size=sample").status_code == 404
