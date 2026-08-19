import pytest
from pydantic import ValidationError
from app.models.case_ingestion import DocumentExtractionResult, IngestedFactorItem, IngestedFactorEvidence
from app.models.case import HistoricalCase
from app.models.factors import ExtractedFactorItem

def test_ingestion_schema_allows_null_factors():
    """Verify the ingestion schema allows null candidate values."""
    payload = {
        "title": "Test Case",
        "incident_date": "1986-01-28",
        "mission_program": "Space Shuttle",
        "outcome_type": "CATASTROPHIC_FAILURE",
        "situation_summary": "A very long summary of what happened that is at least 20 characters long.",
        "key_decision_points": [],
        "documented_contributing_factors": [],
        "documented_safeguards": [],
        "documented_response_actions": [],
        "citation_title": "Official Report",
        "issuing_body": "NASA",
        "publication_year": 1986,
        "factors": {
            "known_unresolved_issue": {
                "factor_id": "known_unresolved_issue",
                "candidate_value": None,
                "evidence": None
            },
            "safety_margin_degraded": {
                "factor_id": "safety_margin_degraded",
                "candidate_value": True,
                "evidence": {"quote": "Degraded", "source_page": 10}
            }
        }
    }
    
    # Should validate successfully
    result = DocumentExtractionResult.model_validate(payload)
    assert result.factors["known_unresolved_issue"].candidate_value is None
    assert result.factors["safety_margin_degraded"].candidate_value is True
    assert result.factors["safety_margin_degraded"].evidence.source_page == 10

def test_historical_case_rejects_null_factors():
    """Verify that the strict HistoricalCase schema still rejects null values."""
    payload = {
        "id": "CASE-123",
        "case_name": "Test Case",
        "mission_program": "Space Shuttle",
        "incident_date": "1986-01-28",
        "outcome_type": "CATASTROPHIC_FAILURE",
        "verification_status": "USER_SUBMITTED",
        "situation_summary": "A very long summary of what happened that is at least 20 characters long.",
        "key_decision_points": [],
        "documented_contributing_factors": [],
        "documented_safeguards": [],
        "documented_response_actions": [],
        "citation": {
            "id": "CIT-123",
            "report_title": "Official Report",
            "issuing_body": "NASA",
            "publication_year": 1986,
            "key_excerpts": []
        },
        "secondary_citations": [],
        "factors": {
            "known_unresolved_issue": {
                "value": None, # This should fail
                "evidence_summary": "Missing"
            }
        }
    }
    
    with pytest.raises(ValidationError):
        HistoricalCase.model_validate(payload)
