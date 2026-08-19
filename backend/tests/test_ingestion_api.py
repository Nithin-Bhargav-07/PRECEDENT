import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.v1.ingestion import case_repository
import json

client = TestClient(app)

@pytest.fixture(autouse=True)
def mock_case_repository(tmp_path):
    # Create an empty cases file for testing
    test_file = tmp_path / "cases.json"
    test_file.write_text("[]")
    
    # Backup original path
    original_path = case_repository._data_path
    
    # Force the repo to point to the tmp file and reload
    case_repository._data_path = test_file
    case_repository._loaded = False
    case_repository.load()
    
    yield
    
    # Restore original path
    case_repository._data_path = original_path
    case_repository._loaded = False

def test_admit_endpoint_rejects_incomplete_case():
    payload = {
        "extraction_result": {
            "title": "Incomplete Case",
            "incident_date": "1986-01-28",
            "mission_program": "Test",
            "outcome_type": "CATASTROPHIC_FAILURE",
            "situation_summary": "Test summary that is long enough.",
            "key_decision_points": [],
            "documented_contributing_factors": [],
            "documented_safeguards": [],
            "documented_response_actions": [],
            "citation_title": "Report",
            "issuing_body": "NASA",
            "publication_year": 1986,
            "factors": {}
        },
        "resolved_factors": {
            "known_unresolved_issue": {
                "factor_id": "known_unresolved_issue",
                "candidate_value": None, # Unresolved
                "evidence": None
            }
        }
    }
    
    response = client.post("/api/v1/ingestion/admit", json=payload)
    assert response.status_code == 422 # Because of missing factors and null candidate_value

import uuid

def test_admit_endpoint_accepts_valid_case():
    unique_title = f"Valid Admitted Case {uuid.uuid4()}"
    payload = {
        "extraction_result": {
            "title": unique_title,
            "incident_date": "1986-01-28",
            "mission_program": "Test",
            "outcome_type": "CATASTROPHIC_FAILURE",
            "situation_summary": "Test summary that is long enough for validation.",
            "key_decision_points": [],
            "documented_contributing_factors": [],
            "documented_safeguards": [],
            "documented_response_actions": [],
            "citation_title": "Report",
            "issuing_body": "NASA",
            "publication_year": 1986,
            "factors": {}
        },
        "resolved_factors": {
            "known_unresolved_issue": { "factor_id": "known_unresolved_issue", "candidate_value": True, "evidence": None },
            "safety_margin_degraded": { "factor_id": "safety_margin_degraded", "candidate_value": True, "evidence": None },
            "schedule_pressure": { "factor_id": "schedule_pressure", "candidate_value": "HIGH", "evidence": None },
            "external_conditions_marginal": { "factor_id": "external_conditions_marginal", "candidate_value": False, "evidence": None },
            "dissent_raised_and_overridden": { "factor_id": "dissent_raised_and_overridden", "candidate_value": False, "evidence": None },
            "missing_evidence_acknowledged": { "factor_id": "missing_evidence_acknowledged", "candidate_value": False, "evidence": None },
            "prior_normalization_of_risk": { "factor_id": "prior_normalization_of_risk", "candidate_value": False, "evidence": None },
            "independent_review_skipped": { "factor_id": "independent_review_skipped", "candidate_value": False, "evidence": None }
        }
    }
    
    response = client.post("/api/v1/ingestion/admit", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["case_name"] == unique_title
    
    # Try admitting the same case again -> exact duplicate check
    response2 = client.post("/api/v1/ingestion/admit", json=payload)
    assert response2.status_code == 409
    assert "already exists" in response2.json()["detail"]
    
    # Cleanup repository
    del case_repository._cases_cache[data["id"]]
