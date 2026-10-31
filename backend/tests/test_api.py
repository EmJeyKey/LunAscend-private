from fastapi.testclient import TestClient
from importlib.util import find_spec
import pytest

from lunascend.main import create_app
from lunascend.api.routes import provider_factory
from lunascend.providers import UnavailableProvider


@pytest.fixture
def client(monkeypatch, tmp_path):
    # Missing-resource API tests remain deterministic even on a PC with kernels.
    monkeypatch.setenv("LUNASCEND_KERNEL_DIR", str(tmp_path / "missing-kernels"))
    with TestClient(create_app()) as client:
        yield client


def test_health(client):
    assert client.get("/health").json() == {
        "status": "ok", "application_name": "LunAscend", "api_version": "1.0",
    }
    assert client.get("/health").status_code == 200


def test_info_is_honest(client):
    response = client.get("/api/v1/info")
    assert response.status_code == 200
    info = response.json()
    assert info["implemented_analysis_providers"] == ["scientific"]
    assert not info["scientific_calculations_available"]
    assert not info["mock_analysis_available"]


@pytest.mark.parametrize("mode", ["mock", "scientific"])
def test_valid_request_reports_unavailable_without_results(client, request_data, mode):
    response = client.post("/api/v1/scenarios/analyze", json=request_data | {"provider_mode": mode})
    assert response.status_code == 503
    result = response.json()
    assert result["provider_mode"] == mode
    assert result["request"]["provider_mode"] == mode
    assert result["status"] == "unavailable"
    expected = "MISSING_DATA" if mode == "scientific" and find_spec("spiceypy") else "PROVIDER_UNAVAILABLE"
    assert result["errors"][0]["code"] == expected
    assert result["provenance"][0]["calculation_method"] == "No calculation performed"
    for field in ("observations", "horizon", "visibility_windows", "power", "communication", "resilience"):
        assert result[field] is None


@pytest.mark.parametrize("patch", [{"provider_mode": "auto"}, {"sample_step_s": 0},
                                  {"site": {}}, {"start_utc": "2026-11-14T00:00:00"}])
def test_invalid_requests_are_structured(client, request_data, patch):
    response = client.post("/api/v1/scenarios/analyze", json=request_data | patch)
    assert response.status_code == 422
    assert response.json()["errors"][0]["code"] == "INVALID_REQUEST"


def test_missing_provider_rejected(client, request_data):
    del request_data["provider_mode"]
    assert client.post("/api/v1/scenarios/analyze", json=request_data).status_code == 422


def test_malformed_json_is_safe(client):
    response = client.post("/api/v1/scenarios/analyze", content='{ "secret":',
                           headers={"Content-Type": "application/json"})
    assert response.status_code == 422
    assert "secret" not in response.text


def test_provider_dispatch_and_no_fallback(request_data):
    selected = []

    def factory(mode):
        selected.append(mode)
        return UnavailableProvider(mode)

    app = create_app()
    app.dependency_overrides[provider_factory] = lambda: factory
    with TestClient(app) as client:
        client.post("/api/v1/scenarios/analyze", json=request_data)
    assert selected == ["scientific"]


def test_unexpected_provider_error_is_safe(request_data):
    class BrokenProvider:
        async def analyze(self, request):
            raise RuntimeError("private implementation detail")

    app = create_app()
    app.dependency_overrides[provider_factory] = lambda: lambda mode: BrokenProvider()
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.post("/api/v1/scenarios/analyze", json=request_data)
    assert response.status_code == 500
    assert response.json()["errors"][0]["code"] == "CALCULATION_FAILED"
    assert "private implementation" not in response.text


def test_docs_and_openapi(client):
    assert client.get("/docs").status_code == 200
    schema = client.get("/openapi.json").json()
    assert "ScenarioRequest" in schema["components"]["schemas"]
    assert "503" in schema["paths"]["/api/v1/scenarios/analyze"]["post"]["responses"]
