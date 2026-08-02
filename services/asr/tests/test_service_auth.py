from starlette.testclient import TestClient

import main


AUTH_HEADERS = {
    "Authorization": "Bearer asr-test-token-at-least-thirty-two-characters",
}


def test_service_boundary_requires_authentication_and_limits_requests(monkeypatch) -> None:
    client = TestClient(main.app)

    assert client.get("/live").status_code == 200
    assert client.get("/openapi.json").status_code == 401
    assert client.get(
        "/openapi.json",
        headers={"Authorization": "Bearer wrong-token"},
    ).status_code == 401
    assert client.get("/openapi.json", headers=AUTH_HEADERS).status_code == 200
    assert client.get(
        "/openapi.json",
        headers={**AUTH_HEADERS, "Content-Length": str(main.MAX_HTTP_REQUEST_BYTES + 1)},
    ).status_code == 413

    monkeypatch.setattr(main, "MAX_HTTP_REQUEST_BYTES", 64)
    assert client.post(
        "/openapi.json",
        content=iter([b"a" * 40, b"b" * 40]),
        headers=AUTH_HEADERS,
    ).status_code == 413

    monkeypatch.setattr(main, "SERVICE_TOKEN_CONFIGURED", False)
    assert client.get("/openapi.json", headers=AUTH_HEADERS).status_code == 503
    assert client.get("/ready").json()["status"] == "not_ready"
