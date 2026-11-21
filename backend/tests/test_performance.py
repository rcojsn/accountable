import time

import pytest
from fastapi.testclient import TestClient

from accountable import seed
from accountable.config import Settings
from accountable.main import create_app


@pytest.fixture(scope="module")
def large_client(tmp_path_factory):
    path = tmp_path_factory.mktemp("large") / "large.db"
    app = create_app(Settings(db_path=path, test_mode=False, seed_new_db=False))
    with TestClient(app) as c:
        seed.seed_large(c.app.state.engine)
        yield c


def timed(client, url):
    client.get(url)  # warm up
    start = time.perf_counter()
    r = client.get(url)
    elapsed = (time.perf_counter() - start) * 1000
    assert r.status_code == 200
    return elapsed


@pytest.mark.parametrize("url,limit_ms", [
    ("/api/deals", 300), ("/api/contacts", 300), ("/api/organizations", 300), ("/api/dashboard", 300),
])
def test_lists_and_dashboard_are_fast(large_client, url, limit_ms):  # REQ-6
    assert timed(large_client, url) < limit_ms


def test_contact_timeline_is_fast(large_client):
    contacts = large_client.get("/api/contacts").json()
    assert timed(large_client, f"/api/contacts/{contacts[0]['id']}/timeline") < 100
