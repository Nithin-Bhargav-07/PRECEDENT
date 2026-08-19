from app.models.factors import ExtractedFactorItem
"""Tests for engine abstention gating."""

import pytest
from app.models.enums import ReviewStatus
from app.repositories.case_repository import case_repository
from app.services.engine.matcher import evaluate_situation


@pytest.fixture
def all_cases():
    return case_repository.get_all_cases()


def test_abstention_on_zero_active_factors(all_cases):
    """Verify clean abstention when situation profile has zero active risks."""
    situation_factors = {
        "known_unresolved_issue": False,
        "safety_margin_degraded": False,
        "schedule_pressure": "LOW",
        "external_conditions_marginal": False,
        "dissent_raised_and_overridden": False,
        "missing_evidence_acknowledged": False,
        "prior_normalization_of_risk": False,
        "independent_review_skipped": False,
    }

    result = evaluate_situation(
        session_id="test-sess-nom",
        situation_title="Nominal Pre-Flight Readiness",
        situation_summary="All subsystems green, margins nominal.",
        confirmed_factors={k: ExtractedFactorItem(factor_id=k, value=v, extracted_value=v, confidence=0.9, evidence_quote=None, is_user_modified=False, modification_reason=None) for k,v in situation_factors.items()},
        all_cases=all_cases,
    )

    assert result.status == ReviewStatus.NO_STRONG_PRECEDENT
    assert len(result.matched_cases) == 0
    assert result.abstention_detail is not None
    assert result.abstention_detail.reason_code == "SPARSE_INPUT_DATA"
    assert result.abstention_detail.is_abstaining is True


def test_abstention_on_insufficient_factor_overlap_threshold(all_cases):
    """Verify abstention when overlap is below the threshold."""
    # When 1 active factor exists but overlap is insufficient, it triggers INSUFFICIENT_FACTOR_OVERLAP
    situation_factors = {
        "known_unresolved_issue": False,
        "safety_margin_degraded": False,
        "schedule_pressure": "MEDIUM",
        "external_conditions_marginal": False,
        "dissent_raised_and_overridden": False,
        "missing_evidence_acknowledged": False,
        "prior_normalization_of_risk": False,
        "independent_review_skipped": False,
    }

    result = evaluate_situation(
        session_id="test-sess-weak",
        situation_title="Nominal Checkout",
        situation_summary="Everything within limits.",
        confirmed_factors={k: ExtractedFactorItem(factor_id=k, value=v, extracted_value=v, confidence=0.9, evidence_quote=None, is_user_modified=False, modification_reason=None) for k,v in situation_factors.items()},
        all_cases=all_cases,
    )

    assert result.status == ReviewStatus.NO_STRONG_PRECEDENT
    assert result.abstention_detail is not None
    assert result.abstention_detail.reason_code == "INSUFFICIENT_FACTOR_OVERLAP"
    assert result.abstention_detail.is_abstaining is True
