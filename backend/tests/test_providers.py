import json
import pytest
from unittest.mock import patch, MagicMock

from app.core.config import settings
from app.services.ai.providers import (
    get_provider,
    GraniteProvider,
    GeminiProvider,
    GroqProvider,
    DevelopmentFallbackProvider,
    GeminiAPIError,
    GroqAPIError,
)
from app.services.ai.watsonx_client import WatsonxAPIError
from app.models.factors import ExtractFactorsResponse, ExtractedFactorItem
from app.services.ai.extraction_service import extract_factors_from_text
from app.api.v1.evaluate import evaluate_precedent, EvaluatePrecedentRequest

def test_provider_selection(monkeypatch):
    monkeypatch.setattr(settings, "ai_provider", "gemini")
    provider = get_provider()
    assert isinstance(provider, GeminiProvider)
    assert provider.name == "Gemini"

    monkeypatch.setattr(settings, "ai_provider", "groq")
    provider = get_provider()
    assert isinstance(provider, GroqProvider)
    assert provider.name == "Groq"

    monkeypatch.setattr(settings, "ai_provider", "granite")
    provider = get_provider()
    assert isinstance(provider, GraniteProvider)
    assert provider.name == "IBM Granite"

    monkeypatch.setattr(settings, "ai_provider", "")
    provider = get_provider()
    assert isinstance(provider, DevelopmentFallbackProvider)
    assert provider.name == "DEVELOPMENT FALLBACK"

@patch("app.services.ai.providers.httpx.Client.post")
@patch("app.services.ai.watsonx_client.watsonx_client.generate_text")
def test_common_schema(mock_granite, mock_httpx, monkeypatch):
    mock_json = json.dumps({
        "factors": {
            "known_unresolved_issue": {"value": True, "confidence": 0.9, "evidence_quote": "test"}
        }
    })
    
    # 1. Granite
    monkeypatch.setattr(settings, "ai_provider", "granite")
    monkeypatch.setattr(settings, "watsonx_api_key", "test")
    monkeypatch.setattr(settings, "watsonx_project_id", "test")
    mock_granite.return_value = mock_json
    with patch("app.services.ai.watsonx_client.watsonx_client.is_configured", True):
        res1 = extract_factors_from_text("T", "C", "D")
    assert res1.provider == "IBM Granite"
    assert res1.factors["known_unresolved_issue"].value is True
    
    # 2. Gemini
    monkeypatch.setattr(settings, "ai_provider", "gemini")
    monkeypatch.setattr(settings, "gemini_api_key", "test")
    
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "candidates": [{"content": {"parts": [{"text": mock_json}]}}]
    }
    mock_httpx.return_value = mock_response
    res2 = extract_factors_from_text("T", "C", "D")
    assert res2.provider == "Gemini"
    assert res2.factors["known_unresolved_issue"].value is True

    # 3. Groq
    monkeypatch.setattr(settings, "ai_provider", "groq")
    monkeypatch.setattr(settings, "groq_api_key", "test")
    
    mock_response.json.return_value = {
        "choices": [{"message": {"content": mock_json}}]
    }
    mock_httpx.return_value = mock_response
    res3 = extract_factors_from_text("T", "C", "D")
    assert res3.provider == "Groq"
    assert res3.factors["known_unresolved_issue"].value is True

def test_provider_failure(monkeypatch):
    monkeypatch.setattr(settings, "ai_provider", "gemini")
    monkeypatch.setattr(settings, "gemini_api_key", "")
    
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as excinfo:
        extract_factors_from_text("T", "C", "D")
    assert excinfo.value.status_code == 503

def test_development_fallback(monkeypatch):
    monkeypatch.setattr(settings, "ai_provider", "")
    res = extract_factors_from_text("T", "C", "D")
    assert res.provider == "DEVELOPMENT FALLBACK"
    assert res.factors["known_unresolved_issue"].confidence is None

@pytest.mark.asyncio
async def test_deterministic_isolation():
    # Identical boolean values
    factors1 = {
        "known_unresolved_issue": ExtractedFactorItem(factor_id="known_unresolved_issue", value=True, confidence=0.9, evidence_quote="Q1"),
        "safety_margin_degraded": ExtractedFactorItem(factor_id="safety_margin_degraded", value=False, confidence=0.8, evidence_quote="Q2"),
        "schedule_pressure": ExtractedFactorItem(factor_id="schedule_pressure", value="HIGH", confidence=0.7, evidence_quote="Q3"),
        "external_conditions_marginal": ExtractedFactorItem(factor_id="external_conditions_marginal", value=False),
        "dissent_raised_and_overridden": ExtractedFactorItem(factor_id="dissent_raised_and_overridden", value=False),
        "missing_evidence_acknowledged": ExtractedFactorItem(factor_id="missing_evidence_acknowledged", value=False),
        "prior_normalization_of_risk": ExtractedFactorItem(factor_id="prior_normalization_of_risk", value=False),
        "independent_review_skipped": ExtractedFactorItem(factor_id="independent_review_skipped", value=False),
    }

    factors2 = {
        "known_unresolved_issue": ExtractedFactorItem(factor_id="known_unresolved_issue", value=True, confidence=0.1, evidence_quote="Different"),
        "safety_margin_degraded": ExtractedFactorItem(factor_id="safety_margin_degraded", value=False, confidence=0.2, evidence_quote="Quotes"),
        "schedule_pressure": ExtractedFactorItem(factor_id="schedule_pressure", value="HIGH", confidence=0.3, evidence_quote="Dont"),
        "external_conditions_marginal": ExtractedFactorItem(factor_id="external_conditions_marginal", value=False),
        "dissent_raised_and_overridden": ExtractedFactorItem(factor_id="dissent_raised_and_overridden", value=False),
        "missing_evidence_acknowledged": ExtractedFactorItem(factor_id="missing_evidence_acknowledged", value=False),
        "prior_normalization_of_risk": ExtractedFactorItem(factor_id="prior_normalization_of_risk", value=False),
        "independent_review_skipped": ExtractedFactorItem(factor_id="independent_review_skipped", value=False),
    }

    payload1 = EvaluatePrecedentRequest(session_id="session123", title="Test Title", mission_context="Context", raw_description="Description that is at least ten chars", confirmed_factors=factors1)
    payload2 = EvaluatePrecedentRequest(session_id="session456", title="Test Title 2", mission_context="Context", raw_description="Description that is at least ten chars", confirmed_factors=factors2)

    res1 = await evaluate_precedent(payload1)
    res2 = await evaluate_precedent(payload2)

    # Output ranking and abstention behavior should be exactly identical
    assert res1.status == res2.status
    if res1.matched_cases:
        assert [m.case_id for m in res1.matched_cases] == [m.case_id for m in res2.matched_cases]
