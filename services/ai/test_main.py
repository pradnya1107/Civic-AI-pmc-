import pytest
from httpx import AsyncClient, ASGITransport
from services.ai.main import app
from services.ai.config import AI_SERVICE_SECRET

SECRET_HEADER = {"X-AI-Service-Secret": AI_SERVICE_SECRET}

@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "civicai-ai-service"
        assert "provider" in data

@pytest.mark.asyncio
async def test_analyze_requires_secret():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # No header
        response = await client.post("/analyze", json={
            "complaintId": "comp-123",
            "complaintText": "There is a major water pipe leakage in Shivajinagar.",
        })
        assert response.status_code == 401

        # Invalid header
        response = await client.post("/analyze", headers={"X-AI-Service-Secret": "wrong-secret"}, json={
            "complaintId": "comp-123",
            "complaintText": "There is a major water pipe leakage in Shivajinagar.",
        })
        assert response.status_code == 401

@pytest.mark.asyncio
async def test_analyze_water_complaint_stub():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/analyze",
            headers=SECRET_HEADER,
            json={
                "complaintId": "comp-water-1",
                "complaintText": "Severe water pipe leak and drinking water contamination near FC Road.",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "Water Supply"
        assert data["priority"] in ["HIGH", "CRITICAL"]
        assert 0.0 <= data["confidence"] <= 1.0
        assert "Water Supply" in data["summary"]
        assert data["modelVersion"] == "stub-v1.0.0"

@pytest.mark.asyncio
async def test_analyze_pothole_complaint_stub():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/analyze",
            headers=SECRET_HEADER,
            json={
                "complaintId": "comp-road-1",
                "complaintText": "Deep pothole on the main road causing traffic delays and vehicle damage.",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "Roads & Infrastructure"
        assert data["priority"] in ["MEDIUM", "HIGH"]
        assert 0.0 <= data["confidence"] <= 1.0

@pytest.mark.asyncio
async def test_analyze_critical_danger_priority_stub():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/analyze",
            headers=SECRET_HEADER,
            json={
                "complaintId": "comp-crit-1",
                "title": "Danger of electric shock",
                "description": "Live wire sparking near public school, extreme danger and emergency accident hazard!",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "Electricity"
        assert data["priority"] == "CRITICAL"
        assert data["confidence"] >= 0.85

@pytest.mark.asyncio
async def test_analyze_empty_text_validation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/analyze",
            headers=SECRET_HEADER,
            json={
                "complaintId": "comp-empty",
                "complaintText": "   ",
            },
        )
        assert response.status_code == 422 or response.status_code == 400

@pytest.mark.asyncio
async def test_bearer_authorization_header():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/analyze",
            headers={"Authorization": f"Bearer {AI_SERVICE_SECRET}"},
            json={
                "complaintId": "comp-auth-1",
                "text": "Garbage dump overflowing outside market area.",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "Waste Management"

@pytest.mark.asyncio
async def test_openai_provider_mocked(monkeypatch):
    import json
    from unittest.mock import AsyncMock, MagicMock
    from services.ai.providers.openai_provider import OpenAIProvider

    provider = OpenAIProvider(api_key="test-key", model="gpt-4o-mini")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": json.dumps({
                        "category": "Drainage",
                        "priority": "HIGH",
                        "summary": "Sewage drain overflow on main road causing hazard.",
                        "confidence": 0.95,
                    })
                }
            }
        ]
    }

    async def mock_post(*args, **kwargs):
        return mock_resp

    monkeypatch.setattr("httpx.AsyncClient.post", mock_post)

    result = await provider.analyze("comp-openai-1", "Clogged drainage and sewage backup")
    assert result.category == "Drainage"
    assert result.priority == "HIGH"
    assert result.confidence == 0.95
    assert "openai-gpt-4o-mini" in result.modelVersion

