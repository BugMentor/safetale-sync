"""
E2E tests for GET /api/health.
"""

from unittest.mock import AsyncMock, patch


def test_health_healthy(client):
    with patch("main.check_llm_responding", new_callable=AsyncMock, return_value=(True, "OK")):
        r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "healthy"
    assert data["llm"] == "ok"
    assert data["detail"] == "OK"


def test_health_unhealthy(client):
    with patch("main.check_llm_responding", new_callable=AsyncMock, return_value=(False, "Connection refused")):
        r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "unhealthy"
    assert data["llm"] == "error"
    assert data["detail"] == "Connection refused"
