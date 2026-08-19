"""Integration tests for PRECEDENT FastAPI REST endpoints."""

from fastapi.testclient import TestClient
import pytest

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_check(client):
    """Verify system health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "service" in data


def test_list_cases_endpoint(client):
    """Verify historical cases library endpoint."""
    response = client.get("/api/v1/cases")
    assert response.status_code == 200
    cases = response.json()
    assert len(cases) >= 5
    case_ids = [c["id"] for c in cases]
    assert "CASE-HIST-CHALLENGER-1986" in case_ids
    assert "CASE-HIST-COLUMBIA-2003" in case_ids


def test_get_single_case_endpoint(client):
    """Verify single case retrieval."""
    response = client.get("/api/v1/cases/CASE-HIST-CHALLENGER-1986")
    assert response.status_code == 200
    case = response.json()
    assert case["id"] == "CASE-HIST-CHALLENGER-1986"
    assert case["case_name"] == "Space Shuttle Challenger (STS-51-L)"


def test_extract_factors_endpoint(client):
    """Verify Granite factor extraction endpoint."""
    payload = {
        "title": "Cryogenic Tank Valve Pressure Drop",
        "mission_context": "Flight Readiness Review (FRR)",
        "raw_description": (
            "During pad cryogenic loading, pressure sensor telemetry fluctuated. "
            "Engineers objected to proceeding due to lack of low-temperature data, "
            "but launch director noted tight schedule window."
        ),
    }
    response = client.post("/api/v1/extract-factors", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "factors" in data
    assert len(data["factors"]) == 8
    assert "dissent_raised_and_overridden" in data["factors"]


def test_evaluate_precedent_endpoint(client):
    """Verify deterministic evaluation endpoint."""
    payload = {
        "session_id": "test-eval-api",
        "title": "Cryogenic Joint Thermal Margin",
        "mission_context": "Pre-Launch Review",
        "raw_description": "Cold weather launch review with contractor engineering dissent.",
        "confirmed_factors": {k: {"factor_id": k, "value": v, "extracted_value": v, "confidence": 0.9, "evidence_quote": None, "is_user_modified": False, "modification_reason": None} for k, v in {
            "known_unresolved_issue": True,
            "safety_margin_degraded": True,
            "schedule_pressure": "HIGH",
            "external_conditions_marginal": True,
            "dissent_raised_and_overridden": True,
            "missing_evidence_acknowledged": True,
            "prior_normalization_of_risk": True,
            "independent_review_skipped": True,
        }.items()},
    }
    response = client.post("/api/v1/evaluate-precedent", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "PRECEDENT_FOUND"
    assert len(data["matched_cases"]) >= 1
    assert data["matched_cases"][0]["case_id"] == "CASE-HIST-CHALLENGER-1986"
    assert data["grounded_explanation"] is not None


def test_sessions_lifecycle_and_audit_action(client):
    """Verify complete review session lifecycle and formal audit sign-off."""
    # 1. Create review session
    create_payload = {
        "title": "Orbital Separation Thermal Survey",
        "mission_context": "On-Orbit Anomaly Assessment",
        "raw_description": "Inspection camera shows thermal blanket damage.",
        "submitter_role": "Lead Flight Director",
        "review_board": "Mission Management Team",
        "extracted_factors": {},
    }
    res_create = client.post("/api/v1/sessions", json=create_payload)
    assert res_create.status_code == 201
    session_data = res_create.json()
    session_id = session_data["session_id"]
    assert session_id.startswith("SESS-")

    # 2. Record formal engineer audit sign-off
    action_payload = {
        "session_id": session_id,
        "action": "ACKNOWLEDGED",
        "engineer_notes": "Board reviewed Challenger and Atlantis precedents; contingency reentry profile approved.",
    }
    res_action = client.post(f"/api/v1/sessions/{session_id}/action", json=action_payload)
    assert res_action.status_code == 200
    action_data = res_action.json()
    assert action_data["status"] == "SUCCESS"
    assert action_data["action"] == "ACKNOWLEDGED"

    # 3. Retrieve session record
    res_get = client.get(f"/api/v1/sessions/{session_id}")
    assert res_get.status_code == 200
    record = res_get.json()
    assert record["audit_action"]["action"] == "ACKNOWLEDGED"
    assert record["audit_action"]["engineer_notes"] == action_payload["engineer_notes"]

    # 4. Attempt to overwrite the action
    second_action_payload = {
        "session_id": session_id,
        "action": "DISMISSED",
        "engineer_notes": "Trying to overwrite",
    }
    res_second_action = client.post(f"/api/v1/sessions/{session_id}/action", json=second_action_payload)
    assert res_second_action.status_code == 409

    # 5. Verify it remained unchanged
    res_get_again = client.get(f"/api/v1/sessions/{session_id}")
    assert res_get_again.json()["audit_action"]["action"] == "ACKNOWLEDGED"

def test_create_historical_case(client):
    """Verify user can submit a new historical case."""
    payload = {
        "id": "CASE-USER-TEST-1",
        "case_name": "Test User Case",
        "mission_program": "Test Program",
        "incident_date": "2026-08-09",
        "outcome_type": "NEAR_MISS_RECOVERED",
        "verification_status": "USER_SUBMITTED",
        "situation_summary": "This is a detailed summary of the situation that meets the 20 character limit requirement.",
        "factors": {
            "known_unresolved_issue": {"value": False, "evidence_summary": "Not available", "source_quote": ""},
            "safety_margin_degraded": {"value": False, "evidence_summary": "Not available", "source_quote": ""},
            "schedule_pressure": {"value": "LOW", "evidence_summary": "Not available", "source_quote": ""},
            "external_conditions_marginal": {"value": False, "evidence_summary": "Not available", "source_quote": ""},
            "dissent_raised_and_overridden": {"value": False, "evidence_summary": "Not available", "source_quote": ""},
            "missing_evidence_acknowledged": {"value": False, "evidence_summary": "Not available", "source_quote": ""},
            "prior_normalization_of_risk": {"value": False, "evidence_summary": "Not available", "source_quote": ""},
            "independent_review_skipped": {"value": False, "evidence_summary": "Not available", "source_quote": ""}
        },
        "citation": {
            "id": "CIT-TEST-1",
            "report_title": "Test Report",
            "issuing_body": "Test Body",
            "publication_year": 2026
        }
    }
    response = client.post("/api/v1/cases", json=payload)
    assert response.status_code == 201
    case = response.json()
    assert case["id"] == "CASE-USER-TEST-1"
    assert case["verification_status"] == "USER_SUBMITTED"

def test_protect_verified_cases(client):
    """Verify existing verified cases cannot be overwritten."""
    payload = {
        "id": "CASE-HIST-CHALLENGER-1986",
        "case_name": "Overwrite Attempt",
        "mission_program": "STS",
        "incident_date": "1986-01-28",
        "outcome_type": "CATASTROPHIC_FAILURE",
        "verification_status": "USER_SUBMITTED",
        "situation_summary": "This is a detailed summary of the situation that meets the 20 character limit requirement.",
        "factors": {
            "known_unresolved_issue": {"value": False, "evidence_summary": "Not available", "source_quote": ""},
            "safety_margin_degraded": {"value": False, "evidence_summary": "Not available", "source_quote": ""},
            "schedule_pressure": {"value": "LOW", "evidence_summary": "Not available", "source_quote": ""},
            "external_conditions_marginal": {"value": False, "evidence_summary": "Not available", "source_quote": ""},
            "dissent_raised_and_overridden": {"value": False, "evidence_summary": "Not available", "source_quote": ""},
            "missing_evidence_acknowledged": {"value": False, "evidence_summary": "Not available", "source_quote": ""},
            "prior_normalization_of_risk": {"value": False, "evidence_summary": "Not available", "source_quote": ""},
            "independent_review_skipped": {"value": False, "evidence_summary": "Not available", "source_quote": ""}
        },
        "citation": {
            "id": "CIT-TEST-2",
            "report_title": "Test Report",
            "issuing_body": "Test Body",
            "publication_year": 2026
        }
    }
    response = client.post("/api/v1/cases", json=payload)
    assert response.status_code == 400
    assert "Cannot overwrite verified historical case" in response.json()["detail"]


def test_user_case_trust_boundary(client):
    """Verify that a user-submitted case cannot enter the trusted corpus even if passed with VERIFIED status."""
    payload = {
        "id": "CASE-USER-BOUNDARY-1",
        "case_name": "Boundary Test Case",
        "mission_program": "Test",
        "incident_date": "2026-08-09",
        "outcome_type": "CATASTROPHIC_FAILURE",
        "verification_status": "VERIFIED", # Try to cheat
        "situation_summary": "This is a detailed summary of the situation that meets the 20 character limit requirement.",
        "factors": {
            "known_unresolved_issue": {"value": True, "evidence_summary": "Not available", "source_quote": ""},
            "safety_margin_degraded": {"value": True, "evidence_summary": "Not available", "source_quote": ""},
            "schedule_pressure": {"value": "HIGH", "evidence_summary": "Not available", "source_quote": ""},
            "external_conditions_marginal": {"value": True, "evidence_summary": "Not available", "source_quote": ""},
            "dissent_raised_and_overridden": {"value": True, "evidence_summary": "Not available", "source_quote": ""},
            "missing_evidence_acknowledged": {"value": True, "evidence_summary": "Not available", "source_quote": ""},
            "prior_normalization_of_risk": {"value": True, "evidence_summary": "Not available", "source_quote": ""},
            "independent_review_skipped": {"value": True, "evidence_summary": "Not available", "source_quote": ""}
        },
        "citation": {
            "id": "CIT-BOUNDARY-1",
            "report_title": "Test Report",
            "issuing_body": "Test Body",
            "publication_year": 2026
        }
    }
    # 1 & 2. Create the case
    res_create = client.post("/api/v1/cases", json=payload)
    assert res_create.status_code == 201
    
    # 3. Verify it was forced to USER_SUBMITTED
    created_case = res_create.json()
    assert created_case["verification_status"] == "USER_SUBMITTED"
    
    # 4. Run evaluate-precedent with identical factors
    eval_payload = {
        "session_id": "test-boundary-eval",
        "title": "Boundary Evaluation",
        "mission_context": "Test",
        "raw_description": "A test situation that perfectly matches the user case.",
        "confirmed_factors": {k: {"factor_id": k, "value": v["value"], "extracted_value": v["value"], "confidence": 0.9, "evidence_quote": None, "is_user_modified": False, "modification_reason": None} for k, v in payload["factors"].items()}
    }
    res_eval = client.post("/api/v1/evaluate-precedent", json=eval_payload)
    assert res_eval.status_code == 200
    eval_data = res_eval.json()
    
    # 5. Verify the user case is NOT in the matched cases
    if eval_data.get("matched_cases"):
        for match in eval_data["matched_cases"]:
            assert match["case_id"] != "CASE-USER-BOUNDARY-1"


def test_session_persistence(client):
    """Verify session data survives persistence reload."""
    from app.api.v1.sessions import _load_sessions, _SESSIONS_STORE
    
    # 1. Create a session
    create_payload = {
        "title": "Persistence Test Session",
        "mission_context": "Testing",
        "raw_description": "Testing session persistence across reloads.",
        "submitter_role": "Engineer",
        "review_board": "Test Board",
        "extracted_factors": {},
    }
    res_create = client.post("/api/v1/sessions", json=create_payload)
    assert res_create.status_code == 201
    session_id = res_create.json()["session_id"]
    
    # 3. Record an engineering sign-off
    action_payload = {
        "session_id": session_id,
        "action": "DISMISSED",
        "engineer_notes": "Test persistence",
    }
    client.post(f"/api/v1/sessions/{session_id}/action", json=action_payload)
    
    # 4. Reload the session store from the sessions.json persistence layer
    _SESSIONS_STORE.clear()
    _load_sessions()
    
    # 5 & 6. Verify the session and sign-off are still present
    assert session_id in _SESSIONS_STORE
    record = _SESSIONS_STORE[session_id]
    assert record.input.title == "Persistence Test Session"
    assert record.audit_action.action == "DISMISSED"

