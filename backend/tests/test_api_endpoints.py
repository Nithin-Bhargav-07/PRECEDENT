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
    res_create = client.post("/api/v1/sessions", json={
        "title": "Cryogenic Joint Thermal Margin",
        "mission_context": "Pre-Launch Review",
        "raw_description": "Cold weather launch review with contractor engineering dissent.",
        "submitter_role": "Engineer",
        "review_board": "Test Board",
        "extracted_factors": {}
    })
    session_id = res_create.json()["session_id"]
    
    payload = {
        "session_id": session_id,
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
    
    # 4. Create a session and run evaluate-precedent with identical factors
    res_sess = client.post("/api/v1/sessions", json={
        "title": "Boundary Evaluation",
        "mission_context": "Test",
        "raw_description": "A test situation that perfectly matches the user case.",
        "submitter_role": "Engineer",
        "review_board": "Test Board",
        "extracted_factors": {}
    })
    session_id = res_sess.json()["session_id"]
    
    eval_payload = {
        "session_id": session_id,
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


def test_session_audit_confirmed_factors_persistence(client):
    """Verify that engineer-confirmed factors are properly persisted and overwrite initial extraction."""
    from app.api.v1.sessions import _SESSIONS_STORE
    
    # 1. AI extraction produces initial factors (simulated via create_session)
    initial_factors = {
        "known_unresolved_issue": {"factor_id": "known_unresolved_issue", "value": False, "extracted_value": False, "confidence": 0.8, "evidence_quote": None, "is_user_modified": False, "modification_reason": None},
        "safety_margin_degraded": {"factor_id": "safety_margin_degraded", "value": False, "extracted_value": False, "confidence": 0.8, "evidence_quote": None, "is_user_modified": False, "modification_reason": None},
        "schedule_pressure": {"factor_id": "schedule_pressure", "value": "LOW", "extracted_value": "LOW", "confidence": 0.8, "evidence_quote": None, "is_user_modified": False, "modification_reason": None},
        "external_conditions_marginal": {"factor_id": "external_conditions_marginal", "value": False, "extracted_value": False, "confidence": 0.8, "evidence_quote": None, "is_user_modified": False, "modification_reason": None},
        "dissent_raised_and_overridden": {"factor_id": "dissent_raised_and_overridden", "value": False, "extracted_value": False, "confidence": 0.8, "evidence_quote": None, "is_user_modified": False, "modification_reason": None},
        "missing_evidence_acknowledged": {"factor_id": "missing_evidence_acknowledged", "value": False, "extracted_value": False, "confidence": 0.8, "evidence_quote": None, "is_user_modified": False, "modification_reason": None},
        "prior_normalization_of_risk": {"factor_id": "prior_normalization_of_risk", "value": False, "extracted_value": False, "confidence": 0.8, "evidence_quote": None, "is_user_modified": False, "modification_reason": None},
        "independent_review_skipped": {"factor_id": "independent_review_skipped", "value": False, "extracted_value": False, "confidence": 0.8, "evidence_quote": None, "is_user_modified": False, "modification_reason": None},
    }
    
    create_payload = {
        "title": "Audit Persistence Test",
        "mission_context": "Testing",
        "raw_description": "Testing confirmed factors persistence.",
        "submitter_role": "Engineer",
        "review_board": "Test Board",
        "extracted_factors": initial_factors,
    }
    res_create = client.post("/api/v1/sessions", json=create_payload)
    assert res_create.status_code == 201
    session_id = res_create.json()["session_id"]
    
    # 2. Engineer modifies a factor
    confirmed_factors = initial_factors.copy()
    confirmed_factors["known_unresolved_issue"] = {
        "factor_id": "known_unresolved_issue", 
        "value": True, # Changed from False to True
        "extracted_value": False, 
        "confidence": 0.8, 
        "evidence_quote": None, 
        "is_user_modified": True, 
        "modification_reason": "Engineer override"
    }
    confirmed_factors["schedule_pressure"] = {
        "factor_id": "schedule_pressure", 
        "value": "HIGH", # Changed from LOW to HIGH
        "extracted_value": "LOW", 
        "confidence": 0.8, 
        "evidence_quote": None, 
        "is_user_modified": True, 
        "modification_reason": "Engineer override"
    }
    
    # 3. Evaluate with confirmed factors
    eval_payload = {
        "session_id": session_id,
        "title": "Audit Persistence Test",
        "mission_context": "Testing",
        "raw_description": "Testing confirmed factors persistence.",
        "confirmed_factors": confirmed_factors,
    }
    res_eval = client.post("/api/v1/evaluate-precedent", json=eval_payload)
    assert res_eval.status_code == 200
    
    # 4. Verify the session contains the confirmed factors
    res_get = client.get(f"/api/v1/sessions/{session_id}")
    assert res_get.status_code == 200
    record = res_get.json()
    
    # The persisted session should reflect the engineer's manual override
    persisted_factors = record["extracted_factors"]
    assert persisted_factors["known_unresolved_issue"]["value"] is True
    assert persisted_factors["known_unresolved_issue"]["is_user_modified"] is True
    assert persisted_factors["schedule_pressure"]["value"] == "HIGH"
    
    # Also verify the in-memory store
    assert _SESSIONS_STORE[session_id].extracted_factors["known_unresolved_issue"].value is True
    assert _SESSIONS_STORE[session_id].extracted_factors["schedule_pressure"].value == "HIGH"


def test_session_immutable_after_sign_off(client):
    """Verify that a session cannot be re-evaluated after it has been signed off."""
    # 1. Create a session
    create_payload = {
        "title": "Immutability Test Session",
        "mission_context": "Testing",
        "raw_description": "Testing that session cannot be modified after sign-off.",
        "submitter_role": "Engineer",
        "review_board": "Test Board",
        "extracted_factors": {},
    }
    res_create = client.post("/api/v1/sessions", json=create_payload)
    assert res_create.status_code == 201
    session_id = res_create.json()["session_id"]
    
    # 2. Record an engineering sign-off
    action_payload = {
        "session_id": session_id,
        "action": "ACKNOWLEDGED",
        "engineer_notes": "Signed off.",
    }
    res_action = client.post(f"/api/v1/sessions/{session_id}/action", json=action_payload)
    assert res_action.status_code == 200
    
    # 3. Attempt to evaluate the session again
    eval_payload = {
        "session_id": session_id,
        "title": "Immutability Test Session",
        "mission_context": "Testing",
        "raw_description": "Testing that session cannot be modified after sign-off.",
        "confirmed_factors": {},
    }
    res_eval = client.post("/api/v1/evaluate-precedent", json=eval_payload)
    
    # 4. Verify that it is rejected with 409 Conflict
    assert res_eval.status_code == 409
    assert "already been signed off" in res_eval.json()["detail"]


def test_legacy_session_analysis_summary_compatibility():
    """Verify that existing sparse SessionAnalysisSummary records deserialize successfully."""
    from app.models.session import SessionAnalysisSummary
    from app.models.enums import ReviewStatus
    
    legacy_data = {
        "status": ReviewStatus.PRECEDENT_FOUND,
        "top_matched_case_names": ["Space Shuttle Challenger (STS-51-L)"],
        "overlap_score": 7.5,
        "category_breadth": 4,
        "counter_evidence_found": False
    }
    
    summary = SessionAnalysisSummary(**legacy_data)
    assert summary.status == ReviewStatus.PRECEDENT_FOUND
    assert summary.matched_cases is None
    assert summary.confidence is None
    assert summary.counter_evidence is None
    assert summary.grounded_explanation is None
    assert summary.abstention_detail is None


def test_evaluate_precedent_rich_persistence(client):
    """Verify that evaluate_precedent persists rich fields on the session."""
    # 1. Create a session
    create_payload = {
        "title": "Rich Persistence Test Session",
        "mission_context": "Testing",
        "raw_description": "Testing rich fields persistence.",
        "submitter_role": "Engineer",
        "review_board": "Test Board",
        "extracted_factors": {},
    }
    res_create = client.post("/api/v1/sessions", json=create_payload)
    assert res_create.status_code == 201
    session_id = res_create.json()["session_id"]
    
    # 2. Evaluate precedent
    eval_payload = {
        "session_id": session_id,
        "title": "Rich Persistence Test Session",
        "mission_context": "Testing",
        "raw_description": "Testing rich fields persistence.",
        "confirmed_factors": {
            k: {"factor_id": k, "value": v, "extracted_value": v, "confidence": 0.9, "evidence_quote": None, "is_user_modified": False, "modification_reason": None} for k, v in {
                "known_unresolved_issue": True,
                "safety_margin_degraded": True,
                "schedule_pressure": "HIGH",
                "external_conditions_marginal": True,
                "dissent_raised_and_overridden": True,
                "missing_evidence_acknowledged": True,
                "prior_normalization_of_risk": True,
                "independent_review_skipped": True,
            }.items()
        },
    }
    res_eval = client.post("/api/v1/evaluate-precedent", json=eval_payload)
    assert res_eval.status_code == 200
    
    # 3. Retrieve session and check rich fields
    res_get = client.get(f"/api/v1/sessions/{session_id}")
    assert res_get.status_code == 200
    record = res_get.json()
    
    analysis = record.get("analysis_result")
    assert analysis is not None
    assert "matched_cases" in analysis
    assert analysis["matched_cases"] is not None
    assert len(analysis["matched_cases"]) >= 1
    assert "confidence" in analysis
    assert analysis["confidence"] is not None
    assert "grounded_explanation" in analysis
    assert analysis["grounded_explanation"] is not None
    # counter_evidence might be empty list but shouldn't be None (wait, if result.counter_evidence is [], then it's [])
    # abstention_detail might be None if status is PRECEDENT_FOUND
