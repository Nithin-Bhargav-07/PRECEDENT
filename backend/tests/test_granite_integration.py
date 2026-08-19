from app.models.factors import ExtractedFactorItem
"""Tests for IBM Granite factor extraction and grounded explanation services."""

import pytest
from app.models.enums import ReviewStatus, SchedulePressureLevel
from app.models.factors import REQUIRED_FACTOR_IDS
from app.repositories.case_repository import case_repository
from app.services.ai.explanation_service import generate_grounded_explanation
from app.services.ai.extraction_service import extract_factors_from_text
from app.services.ai.watsonx_client import strip_granite_json_markdown
from app.services.engine.matcher import evaluate_situation


@pytest.fixture
def all_cases():
    return case_repository.get_all_cases()


def test_strip_granite_json_markdown():
    """Verify code block stripping from Granite completions."""
    raw_markdown = "```json\n{\"factors\": {\"known_unresolved_issue\": {\"value\": true}}}\n```"
    cleaned = strip_granite_json_markdown(raw_markdown)
    assert cleaned == "{\"factors\": {\"known_unresolved_issue\": {\"value\": true}}}"

    raw_plain = "{\"factors\": {}}"
    assert strip_granite_json_markdown(raw_plain) == raw_plain


def test_granite_factor_extraction_structure():
    """Verify factor extraction outputs exactly 8 validated factors."""
    title = "Booster Joint Thermal Margin Review"
    mission_context = "Flight Readiness Review (FRR) - Level III"
    description = (
        "During pre-launch thermal testing at 28°F, primary seal resiliency showed degradation. "
        "Engineers objected to launch due to past O-ring blow-by history on prior flights, "
        "but management cited launch window deadlines and overruled the engineering dissent."
    )

    response = extract_factors_from_text(title, mission_context, description)
    assert len(response.factors) == 8
    assert set(response.factors.keys()) == REQUIRED_FACTOR_IDS

    # Check specific extracted flags
    assert response.factors["known_unresolved_issue"].value is True
    assert response.factors["dissent_raised_and_overridden"].value is True
    assert response.factors["schedule_pressure"].value in {
        SchedulePressureLevel.HIGH,
        SchedulePressureLevel.MEDIUM,
    }


def test_granite_grounded_explanation_on_match(all_cases):
    """Verify grounded explanation generation on matched precedent."""
    situation_factors = {
        "known_unresolved_issue": True,
        "safety_margin_degraded": True,
        "schedule_pressure": SchedulePressureLevel.HIGH,
        "external_conditions_marginal": True,
        "dissent_raised_and_overridden": True,
        "missing_evidence_acknowledged": True,
        "prior_normalization_of_risk": True,
        "independent_review_skipped": True,
    }

    result = evaluate_situation(
        session_id="test-granite-sess",
        situation_title="Joint Temperature Review",
        situation_summary="Ambient temperature 29°F, dissent overruled.",
        confirmed_factors={k: ExtractedFactorItem(factor_id=k, value=v, extracted_value=v, confidence=0.9, evidence_quote=None, is_user_modified=False, modification_reason=None) for k,v in situation_factors.items()},
        all_cases=all_cases,
    )

    assert result.status == ReviewStatus.PRECEDENT_FOUND
    explanation = generate_grounded_explanation(
        analysis_result=result,
        situation_title="Joint Temperature Review",
        situation_summary="Ambient temperature 29°F, dissent overruled.",
    )

    assert explanation is not None
    assert len(explanation.grounded_narrative) > 20
    assert len(explanation.grounded_facts_used) >= 2
    # Verify no GO / NO-GO recommendations in narrative
    assert "recommend go" not in explanation.grounded_narrative.lower()
    assert "recommend no-go" not in explanation.grounded_narrative.lower()


def test_granite_explanation_bypassed_on_abstention(all_cases):
    """Verify Granite is bypassed completely when engine abstains."""
    situation_factors = {
        "known_unresolved_issue": False,
        "safety_margin_degraded": False,
        "schedule_pressure": SchedulePressureLevel.LOW,
        "external_conditions_marginal": False,
        "dissent_raised_and_overridden": False,
        "missing_evidence_acknowledged": False,
        "prior_normalization_of_risk": False,
        "independent_review_skipped": False,
    }

    result = evaluate_situation(
        session_id="test-nom-sess",
        situation_title="Nominal Flight Review",
        situation_summary="All checkouts nominal.",
        confirmed_factors={k: ExtractedFactorItem(factor_id=k, value=v, extracted_value=v, confidence=0.9, evidence_quote=None, is_user_modified=False, modification_reason=None) for k,v in situation_factors.items()},
        all_cases=all_cases,
    )

    assert result.status == ReviewStatus.NO_STRONG_PRECEDENT
    explanation = generate_grounded_explanation(
        analysis_result=result,
        situation_title="Nominal Flight Review",
        situation_summary="All checkouts nominal.",
    )

    assert explanation is None
