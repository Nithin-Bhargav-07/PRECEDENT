"""
End-to-End Scenario & Architectural Invariant Tests for PRECEDENT.
Verifies all 4 demo scenarios, abstention gating, Granite fallback, and audit lifecycle.
"""

from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.repositories.case_repository import case_repository


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def all_cases():
    return case_repository.get_all_cases()


def test_scenario_1_challenger_analog_end_to_end(client, all_cases):
    """
    Scenario 1: Challenger Analog (STS-51-L)
    Pre-launch teleconference review with cold weather, O-ring blow-by history,
    contractor dissent overruled, and schedule pressure.
    """
    # 1. Granite Factor Extraction
    title = "Solid Rocket Booster O-Ring Low Temperature Launch Clearance"
    mission_context = "STS Flight Readiness Review (FRR) — Level III / Level IV"
    raw_desc = (
        "During the pre-launch teleconference at Launch Complex 39B, forecasted overnight "
        "ambient temperature is 29°F, far below the demonstrated test limit of 53°F. "
        "Propulsion contractor engineers formally recommend NO LAUNCH due to primary O-ring resiliency data "
        "and documented blow-by on STS-51-C. NASA project managers contest the recommendation, demanding "
        "engineers prove the joint will fail. In an offline caucus, contractor management overrules engineering "
        "dissent to meet tight launch windows, proceeding without low-temperature qualification data."
    )

    extract_res = client.post("/api/v1/extract-factors", json={
        "title": title,
        "mission_context": mission_context,
        "raw_description": raw_desc,
    })
    assert extract_res.status_code == 200
    factors = extract_res.json()["factors"]
    assert len(factors) == 8

    # 2. Deterministic Evaluation
    res_create = client.post("/api/v1/sessions", json={
        "title": "Cryogenic Joint Thermal Margin",
        "mission_context": "Pre-Launch Review (FRR)",
        "raw_description": "Cold weather launch review with contractor engineering dissent on joint sealing performance.",
        "submitter_role": "Engineer",
        "review_board": "Test Board",
        "extracted_factors": {}
    })
    session_id = res_create.json()["session_id"]
    
    eval_res = client.post("/api/v1/evaluate-precedent", json={
        "session_id": session_id,
        "title": "Cryogenic Joint Thermal Margin",
        "mission_context": mission_context,
        "raw_description": raw_desc,
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
    })
    assert eval_res.status_code == 200
    data = eval_res.json()

    assert data["status"] == "PRECEDENT_FOUND"
    assert data["confidence"]["level"] == "HIGH"
    assert data["matched_cases"][0]["case_id"] == "CASE-HIST-CHALLENGER-1986"
    assert data["matched_cases"][0]["overlap_score"] == 8.0
    assert len(data["counter_evidence"]) >= 1
    assert data["grounded_explanation"] is not None

    # 3. Formal Engineer Sign-off
    sign_res = client.post(f"/api/v1/sessions/{session_id}/action", json={
        "session_id": session_id,
        "action": "ACKNOWLEDGED",
        "engineer_notes": "Board acknowledged Challenger precedent.",
    })
    assert sign_res.status_code == 200
    assert sign_res.json()["status"] == "SUCCESS"


def test_scenario_2_columbia_analog_end_to_end(client):
    """
    Scenario 2: Columbia Analog (STS-107)
    Ascent debris strike assessment on orbit with dismissed DoD imagery requests.
    """
    res_create = client.post("/api/v1/sessions", json={
        "title": "External Tank Foam Strike Left Wing Leading Edge Assessment",
        "mission_context": "Mission Management Team (MMT) — Flight Day 5 Review",
        "raw_description": "Ascent debris impact on RCC wing panel with imagery requests denied.",
        "submitter_role": "Engineer",
        "review_board": "Test Board",
        "extracted_factors": {}
    })
    session_id = res_create.json()["session_id"]
    
    eval_res = client.post("/api/v1/evaluate-precedent", json={
        "session_id": session_id,
        "title": "External Tank Foam Strike Left Wing Leading Edge Assessment",
        "mission_context": "Mission Management Team (MMT) — Flight Day 5 Review",
        "raw_description": "Ascent debris impact on RCC wing panel with imagery requests denied.",
        "confirmed_factors": {k: {"factor_id": k, "value": v, "extracted_value": v, "confidence": 0.9, "evidence_quote": None, "is_user_modified": False, "modification_reason": None} for k, v in {
            "known_unresolved_issue": True,
            "safety_margin_degraded": True,
            "schedule_pressure": "HIGH",
            "external_conditions_marginal": False,
            "dissent_raised_and_overridden": True,
            "missing_evidence_acknowledged": True,
            "prior_normalization_of_risk": True,
            "independent_review_skipped": True,
        }.items()},
    })
    assert eval_res.status_code == 200
    data = eval_res.json()
    assert data["status"] == "PRECEDENT_FOUND"
    matched_ids = [m["case_id"] for m in data["matched_cases"]]
    assert "CASE-HIST-COLUMBIA-2003" in matched_ids
    assert data["grounded_explanation"] is not None


def test_scenario_3_nominal_abstention_bypasses_granite(client):
    """
    Scenario 3: Nominal Flight Review (Zero Risk Factors)
    Ensures the engine abstains cleanly and Granite is completely bypassed.
    """
    res_create = client.post("/api/v1/sessions", json={
        "title": "Nominal Flight Readiness Subsystem Sign-Off",
        "mission_context": "Flight Readiness Review (FRR)",
        "raw_description": "All subsystems nominal with verified margins.",
        "submitter_role": "Engineer",
        "review_board": "Test Board",
        "extracted_factors": {}
    })
    session_id = res_create.json()["session_id"]
    
    eval_res = client.post("/api/v1/evaluate-precedent", json={
        "session_id": session_id,
        "title": "Nominal Flight Readiness Subsystem Sign-Off",
        "mission_context": "Flight Readiness Review (FRR)",
        "raw_description": "All subsystems nominal with verified margins.",
        "confirmed_factors": {k: {"factor_id": k, "value": v, "extracted_value": v, "confidence": 0.9, "evidence_quote": None, "is_user_modified": False, "modification_reason": None} for k, v in {
            "known_unresolved_issue": False,
            "safety_margin_degraded": False,
            "schedule_pressure": "LOW",
            "external_conditions_marginal": False,
            "dissent_raised_and_overridden": False,
            "missing_evidence_acknowledged": False,
            "prior_normalization_of_risk": False,
            "independent_review_skipped": False,
        }.items()},
    })
    assert eval_res.status_code == 200
    data = eval_res.json()
    assert data["status"] == "NO_STRONG_PRECEDENT"
    assert data["confidence"]["level"] == "NONE"
    assert data["abstention_detail"] is not None
    assert data["abstention_detail"]["reason_code"] == "SPARSE_INPUT_DATA"
    # Granite explanation MUST be None on abstention
    assert data["grounded_explanation"] is None


def test_scenario_4_human_override_flow(client):
    """
    Scenario 4: Human Engineer Factor Override
    Verifies that modifying a factor from nominal to active risk correctly changes the evaluation outcome.
    """
    # Start with all nominal -> Abstains
    nominal_factors = {
        "known_unresolved_issue": False,
        "safety_margin_degraded": False,
        "schedule_pressure": "LOW",
        "external_conditions_marginal": False,
        "dissent_raised_and_overridden": False,
        "missing_evidence_acknowledged": False,
        "prior_normalization_of_risk": False,
        "independent_review_skipped": False,
    }
    res_create = client.post("/api/v1/sessions", json={
        "title": "Initial Nominal Review",
        "mission_context": "FRR",
        "raw_description": "Initial draft review",
        "submitter_role": "Engineer",
        "review_board": "Test Board",
        "extracted_factors": {}
    })
    session_id = res_create.json()["session_id"]
    
    res1 = client.post("/api/v1/evaluate-precedent", json={
        "session_id": session_id,
        "title": "Initial Nominal Review",
        "mission_context": "FRR",
        "raw_description": "Initial draft review",
        "confirmed_factors": {k: {"factor_id": k, "value": v, "extracted_value": v, "confidence": 0.9, "evidence_quote": None, "is_user_modified": False, "modification_reason": None} for k, v in nominal_factors.items()},
    })
    assert res1.json()["status"] == "NO_STRONG_PRECEDENT"

    # Engineer overrides 4 factors to reflect actual risk
    overridden_factors = {
        **nominal_factors,
        "known_unresolved_issue": True,
        "safety_margin_degraded": True,
        "schedule_pressure": "HIGH",
        "dissent_raised_and_overridden": True,
        "prior_normalization_of_risk": True,
    }
    res2 = client.post("/api/v1/evaluate-precedent", json={
        "session_id": session_id,
        "title": "Initial Nominal Review",
        "mission_context": "FRR",
        "raw_description": "Updated with telemetry and teleconference facts",
        "confirmed_factors": {k: {"factor_id": k, "value": v, "extracted_value": v, "confidence": 0.9, "evidence_quote": None, "is_user_modified": False, "modification_reason": None} for k, v in overridden_factors.items()},
    })
    assert res2.json()["status"] == "PRECEDENT_FOUND"
    assert res2.json()["confidence"]["level"] in {"HIGH", "MEDIUM"}
