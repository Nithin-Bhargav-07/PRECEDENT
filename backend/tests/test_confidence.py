"""Tests for deterministic confidence calculation."""

from app.models.factors import ExtractedFactorItem
from app.models.enums import ConfidenceLevel, FactorCategoryID
from app.services.engine.confidence import calculate_confidence


def test_high_confidence_calculation():
    """Verify high confidence for 3+ multi-category factor matches."""
    assessment = calculate_confidence(
        overlap_score=3.0,
        total_active_situation_factors=4,
        category_breadth=2,
        shared_factor_ids=["known_unresolved_issue", "schedule_pressure", "dissent_raised_and_overridden"],
        categories_present=[FactorCategoryID.CAT_TECH, FactorCategoryID.CAT_ENV, FactorCategoryID.CAT_HUMAN],
    )
    assert assessment.level == ConfidenceLevel.HIGH
    assert "High confidence" in assessment.rationale
    assert "Known Unresolved Issue" in assessment.rationale


def test_medium_confidence_calculation():
    """Verify medium confidence for 2 factor matches."""
    assessment = calculate_confidence(
        overlap_score=2.0,
        total_active_situation_factors=4,
        category_breadth=1,
        shared_factor_ids=["known_unresolved_issue", "safety_margin_degraded"],
        categories_present=[FactorCategoryID.CAT_TECH],
    )
    assert assessment.level == ConfidenceLevel.MEDIUM
    assert "Medium confidence" in assessment.rationale


def test_low_confidence_calculation():
    """Verify low confidence for single factor match."""
    assessment = calculate_confidence(
        overlap_score=1.0,
        total_active_situation_factors=3,
        category_breadth=1,
        shared_factor_ids=["known_unresolved_issue"],
        categories_present=[FactorCategoryID.CAT_TECH],
    )
    assert assessment.level == ConfidenceLevel.LOW
    assert "Low confidence" in assessment.rationale


def test_none_confidence_calculation():
    """Verify none confidence for zero factors."""
    assessment = calculate_confidence(
        overlap_score=0.0,
        total_active_situation_factors=0,
        category_breadth=0,
        shared_factor_ids=[],
        categories_present=[],
    )
    assert assessment.level == ConfidenceLevel.NONE
    assert "No confidence" in assessment.rationale
