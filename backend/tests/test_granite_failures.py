"""Tests for Granite failure semantics and fallback behavior."""

import json
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.ai.watsonx_client import WatsonxAPIError, watsonx_client

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def extraction_payload():
    return {
        "title": "Test Title",
        "mission_context": "Test Context",
        "raw_description": "Test description of an anomaly that is somewhat long.",
    }

@pytest.fixture(autouse=True)
def reset_watsonx_client_state():
    """Reset watsonx_client singleton state before and after each test."""
    original_initialized = watsonx_client._initialized
    original_configured = getattr(watsonx_client, 'is_configured', False)
    original_model = watsonx_client._model
    
    watsonx_client._initialized = False
    watsonx_client.is_configured = False
    watsonx_client._model = None
    
    yield
    
    watsonx_client._initialized = original_initialized
    watsonx_client.is_configured = original_configured
    watsonx_client._model = original_model

def test_development_fallback(client, extraction_payload):
    """TEST 1: Verify development fallback is used when Granite credentials are absent."""
    # Force credentials to be absent
    with patch("app.core.config.settings.watsonx_api_key", None), \
         patch("app.core.config.settings.watsonx_project_id", None):
        
        # Reset client state to force re-evaluation of credentials
        watsonx_client._initialized = False
        watsonx_client.is_configured = False
        watsonx_client._model = None
        
        response = client.post("/api/v1/extract-factors", json=extraction_payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "factors" in data
        assert len(data["factors"]) == 8
        # Ensure it's not empty/default fallback (it should have actual factor structures)
        assert "dissent_raised_and_overridden" in data["factors"]

def test_granite_success(client, extraction_payload):
    """TEST 2: Verify successful Granite path using mocking."""
    mock_model = MagicMock()
    # Mocking Granite to return a valid JSON response wrapped in markdown
    mock_model.generate_text.return_value = "```json\n" + json.dumps({
        "factors": {
            "known_unresolved_issue": {"value": True, "confidence": 0.9, "evidence_quote": "Yes"},
            "safety_margin_degraded": {"value": False, "confidence": 0.9, "evidence_quote": "No"},
            "schedule_pressure": {"value": "HIGH", "confidence": 0.9, "evidence_quote": "High"},
            "external_conditions_marginal": {"value": False, "confidence": 0.9, "evidence_quote": "No"},
            "dissent_raised_and_overridden": {"value": True, "confidence": 0.9, "evidence_quote": "Yes"},
            "missing_evidence_acknowledged": {"value": False, "confidence": 0.9, "evidence_quote": "No"},
            "prior_normalization_of_risk": {"value": False, "confidence": 0.9, "evidence_quote": "No"},
            "independent_review_skipped": {"value": False, "confidence": 0.9, "evidence_quote": "No"}
        }
    }) + "\n```"

    with patch("app.core.config.settings.ai_provider", "granite"), \
         patch("app.core.config.settings.watsonx_api_key", "fake-key"), \
         patch("app.core.config.settings.watsonx_project_id", "fake-project"):
        
        watsonx_client._initialized = True
        watsonx_client.is_configured = True
        watsonx_client._model = mock_model

        response = client.post("/api/v1/extract-factors", json=extraction_payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["factors"]["known_unresolved_issue"]["value"] is True
        assert data["factors"]["schedule_pressure"]["value"] == "HIGH"

def test_configured_granite_failure(client, extraction_payload):
    """TEST 3: Verify configured Granite failure returns 503 and does NOT fallback."""
    mock_model = MagicMock()
    mock_model.generate_text.side_effect = Exception("Network timeout")

    with patch("app.core.config.settings.ai_provider", "granite"), \
         patch("app.core.config.settings.watsonx_api_key", "fake-key"), \
         patch("app.core.config.settings.watsonx_project_id", "fake-project"):
        
        watsonx_client._initialized = True
        watsonx_client.is_configured = True
        watsonx_client._model = mock_model

        response = client.post("/api/v1/extract-factors", json=extraction_payload)
        
        assert response.status_code == 503
        error_data = response.json()
        assert "Extraction service is unavailable" in error_data["detail"]
        
        # Verify no secret values in error response
        assert "fake-key" not in error_data["detail"]
        assert "fake-project" not in error_data["detail"]

def test_malformed_granite_response(client, extraction_payload):
    """TEST 4: Verify malformed Granite response returns 503 instead of fallback."""
    mock_model = MagicMock()
    # Mocking Granite to return an invalid JSON response
    mock_model.generate_text.return_value = "This is not valid JSON"

    with patch("app.core.config.settings.ai_provider", "granite"), \
         patch("app.core.config.settings.watsonx_api_key", "fake-key"), \
         patch("app.core.config.settings.watsonx_project_id", "fake-project"):
        
        watsonx_client._initialized = True
        watsonx_client.is_configured = True
        watsonx_client._model = mock_model

        response = client.post("/api/v1/extract-factors", json=extraction_payload)
        
        assert response.status_code == 503
        error_data = response.json()
        assert "Provider returned an invalid response" in error_data["detail"]
