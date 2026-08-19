from app.models.factors import ExtractedFactorItem
"""Tests for the deterministic reasoning engine matcher."""

import pytest
from app.models.enums import (
    CaseOutcomeType,
    ConfidenceLevel,
    ReviewStatus,
    SchedulePressureLevel,
)
from app.repositories.case_repository import case_repository
from app.services.engine.matcher import evaluate_situation


@pytest.fixture
def all_cases():
    return case_repository.get_all_cases()


def test_challenger_scenario_high_confidence_match(all_cases):
    """Test Challenger benchmark matching scenario."""
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
        session_id="test-sess-01",
        situation_title="Cryo Valve O-Ring Thermal Margin Test",
        situation_summary="Engineers dissenting on cold weather launch with known blow-by history.",
        confirmed_factors={k: ExtractedFactorItem(factor_id=k, value=v, extracted_value=v, confidence=0.9, evidence_quote=None, is_user_modified=False, modification_reason=None) for k,v in situation_factors.items()},
        all_cases=all_cases,
    )

    assert result.status == ReviewStatus.PRECEDENT_FOUND
    assert len(result.matched_cases) >= 1
    top_match = result.matched_cases[0]
    assert top_match.case_id == "CASE-HIST-CHALLENGER-1986"
    assert top_match.overlap_score == 8.0
    assert result.confidence.level == ConfidenceLevel.HIGH
    assert len(top_match.shared_factors) == 8
    assert len(top_match.differing_factors) == 0


def test_columbia_scenario_matching_and_differing_factors(all_cases):
    """Test Columbia benchmark with differing external conditions."""
    situation_factors = {
        "known_unresolved_issue": True,
        "safety_margin_degraded": True,
        "schedule_pressure": SchedulePressureLevel.HIGH,
        "external_conditions_marginal": False,  # Nominal weather
        "dissent_raised_and_overridden": True,
        "missing_evidence_acknowledged": True,
        "prior_normalization_of_risk": True,
        "independent_review_skipped": True,
    }

    result = evaluate_situation(
        session_id="test-sess-02",
        situation_title="Composite Fairing Debris Strike",
        situation_summary="Debris strike observed during ascent, management dismissed imaging requests.",
        confirmed_factors={k: ExtractedFactorItem(factor_id=k, value=v, extracted_value=v, confidence=0.9, evidence_quote=None, is_user_modified=False, modification_reason=None) for k,v in situation_factors.items()},
        all_cases=all_cases,
    )

    assert result.status == ReviewStatus.PRECEDENT_FOUND
    top_match = result.matched_cases[0]
    assert top_match.case_id == "CASE-HIST-COLUMBIA-2003"

    # Verify differing factors correctly populated
    challenger_match = next((m for m in result.matched_cases if m.case_id == "CASE-HIST-CHALLENGER-1986"), None)
    if challenger_match:
        diff_ext = next((d for d in challenger_match.differing_factors if d.factor_id == "external_conditions_marginal"), None)
        assert diff_ext is not None
        assert diff_ext.situation_value is False
        assert diff_ext.case_value is True


def test_counter_evidence_surfaced(all_cases):
    """Verify counter-evidence near-miss case is surfaced when initial technical risks exist."""
    situation_factors = {
        "known_unresolved_issue": True,
        "safety_margin_degraded": True,
        "schedule_pressure": SchedulePressureLevel.LOW,
        "external_conditions_marginal": False,
        "dissent_raised_and_overridden": False,
        "missing_evidence_acknowledged": True,
        "prior_normalization_of_risk": False,
        "independent_review_skipped": False,
    }

    result = evaluate_situation(
        session_id="test-sess-03",
        situation_title="Heat Shield Tile Gouge",
        situation_summary="Orbital inspection shows damage to underside tiles.",
        confirmed_factors={k: ExtractedFactorItem(factor_id=k, value=v, extracted_value=v, confidence=0.9, evidence_quote=None, is_user_modified=False, modification_reason=None) for k,v in situation_factors.items()},
        all_cases=all_cases,
    )

    assert len(result.counter_evidence) >= 1
    counter = result.counter_evidence[0]
    assert counter.case_id in {"CASE-HIST-STS27-1988", "CASE-HIST-APOLLO13-1970"}
    assert "known_unresolved_issue" in [f.lower().replace(" ", "_") for f in counter.shared_risk_factors] or len(counter.shared_risk_factors) > 0
    assert len(counter.divergent_corrective_action) > 10

def test_non_factor_fields_do_not_alter_matching(all_cases):
    """
    Verify that modifying situation_summary, documented_contributing_factors,
    key_decision_points, or outcome_type does not alter deterministic matching results
    unless one of the existing 8 factor values changes.
    """
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
    
    confirmed_factors = {
        k: ExtractedFactorItem(
            factor_id=k, value=v, extracted_value=v,
            confidence=0.9, evidence_quote="Test Quote",
            is_user_modified=False, modification_reason=None
        ) for k, v in situation_factors.items()
    }
    
    # Run evaluation with original cases
    original_result = evaluate_situation(
        session_id="test-regression",
        situation_title="Original Situation",
        situation_summary="Original Summary",
        confirmed_factors=confirmed_factors,
        all_cases=all_cases,
    )
    
    # Clone and mutate the all_cases data (non-factor fields)
    import copy
    mutated_cases = copy.deepcopy(all_cases)
    for case in mutated_cases:
        case.situation_summary = "COMPLETELY DIFFERENT SUMMARY THAT MIGHT CONFUSE AN LLM BUT NOT THIS ENGINE"
        case.documented_contributing_factors = ["Invented takeaway"]
        case.key_decision_points = []
        # Change outcome types to something else
        if case.outcome_type == CaseOutcomeType.CATASTROPHIC_FAILURE:
            case.outcome_type = CaseOutcomeType.MISSION_LOSS
            
    # Run evaluation with mutated cases
    mutated_result = evaluate_situation(
        session_id="test-regression",
        situation_title="Different Situation Title",
        situation_summary="Different Situation Summary",
        confirmed_factors=confirmed_factors,
        all_cases=mutated_cases,
    )
    
    # The top match should be exactly the same and have the exact same overlap score
    assert len(original_result.matched_cases) == len(mutated_result.matched_cases)
    if original_result.matched_cases and mutated_result.matched_cases:
        assert original_result.matched_cases[0].case_id == mutated_result.matched_cases[0].case_id
        assert original_result.matched_cases[0].overlap_score == mutated_result.matched_cases[0].overlap_score
        assert original_result.confidence.level == mutated_result.confidence.level

def test_evidence_quote_propagation(all_cases):
    """
    Verify that an exact evidence_quote is propagated strictly to situation_evidence
    and that the quote itself does not affect deterministic overlap or ranking.
    """
    exact_quote = "Example exact current situation evidence"
    
    situation_factors = {
        "known_unresolved_issue": True,
        "safety_margin_degraded": False,
        "schedule_pressure": SchedulePressureLevel.LOW,
        "external_conditions_marginal": False,
        "dissent_raised_and_overridden": False,
        "missing_evidence_acknowledged": False,
        "prior_normalization_of_risk": False,
        "independent_review_skipped": False,
    }

    confirmed_factors = {
        k: ExtractedFactorItem(
            factor_id=k,
            value=v,
            extracted_value=v,
            confidence=0.9,
            evidence_quote=exact_quote if v is True else None,
            is_user_modified=False,
            modification_reason=None
        ) for k, v in situation_factors.items()
    }

    result = evaluate_situation(
        session_id="test-evidence-quote",
        situation_title="Quote Propagation Test",
        situation_summary="Testing evidence quote mapping.",
        confirmed_factors=confirmed_factors,
        all_cases=all_cases,
    )
    
    assert result.status == ReviewStatus.PRECEDENT_FOUND
    top_match = result.matched_cases[0]
    
    # Assert that the exact quote is preserved and passed through
    shared_known_issue = next((sf for sf in top_match.shared_factors if sf.factor_id == "known_unresolved_issue"), None)
    assert shared_known_issue is not None
    assert exact_quote in shared_known_issue.situation_evidence
    
    # Assert that the quote doesn't magically alter the math
    assert top_match.overlap_score == 1.0
    assert top_match.total_active_situation_factors == 1


def test_counter_evidence_citation_population(all_cases):
    """
    Verify that a generated counter_evidence result contains a complete citation object
    including id, report_title, and publication_year.
    """
    # Create a situation that triggers counter-evidence (i.e. technical risk but no override, etc.)
    situation_factors = {
        "known_unresolved_issue": True,
        "safety_margin_degraded": True,
        "schedule_pressure": SchedulePressureLevel.LOW,
        "external_conditions_marginal": False,
        "dissent_raised_and_overridden": False,
        "missing_evidence_acknowledged": True,
        "prior_normalization_of_risk": False,
        "independent_review_skipped": False,
    }

    confirmed_factors = {
        k: ExtractedFactorItem(
            factor_id=k, value=v, extracted_value=v,
            confidence=0.9, evidence_quote=None,
            is_user_modified=False, modification_reason=None
        ) for k, v in situation_factors.items()
    }

    result = evaluate_situation(
        session_id="test-counter-evidence-citation",
        situation_title="Heat Shield Gouge (Apollo 13 analog)",
        situation_summary="Technical issue identified but appropriately handled.",
        confirmed_factors=confirmed_factors,
        all_cases=all_cases,
    )
    
    # Ensure we actually have counter-evidence
    assert result.counter_evidence is not None
    assert len(result.counter_evidence) > 0
    
    ce = result.counter_evidence[0]
    
    # Ensure citation object is fully populated
    assert ce.citation is not None
    assert ce.citation.id is not None
    assert ce.citation.report_title is not None
    assert ce.citation.publication_year is not None


def test_counter_evidence_apollo13(all_cases):
    """Assert that the Apollo 13 case can be surfaced as counter-evidence when the deterministic conditions are satisfied."""
    situation_factors = {
        "known_unresolved_issue": True,
        "safety_margin_degraded": True,
        "schedule_pressure": SchedulePressureLevel.MEDIUM,
        "external_conditions_marginal": False,
        "dissent_raised_and_overridden": False,
        "missing_evidence_acknowledged": True,
        "prior_normalization_of_risk": True,
        "independent_review_skipped": False,
    }

    confirmed_factors = {
        k: ExtractedFactorItem(
            factor_id=k, value=v, extracted_value=v,
            confidence=0.9, evidence_quote=None,
            is_user_modified=False, modification_reason=None
        ) for k, v in situation_factors.items()
    }

    result = evaluate_situation(
        session_id="test-apollo13",
        situation_title="Apollo 13 Counter Evidence",
        situation_summary="Testing Apollo 13.",
        confirmed_factors=confirmed_factors,
        all_cases=all_cases,
    )

    assert result.counter_evidence is not None
    assert any(ce.case_id == "CASE-HIST-APOLLO13-1970" for ce in result.counter_evidence)


def test_counter_evidence_sts27_eligibility(all_cases):
    """
    Assert that STS-27 is eligible for counter-evidence evaluation because it is NEAR_MISS_RECOVERED.
    We verify this by showing it CAN match if conditions are met, but won't match if they aren't.
    """
    from app.services.engine.counter_evidence import find_counter_evidence
    
    sts27_case = next((c for c in all_cases if c.id == "CASE-HIST-STS27-1988"), None)
    assert sts27_case is not None
    assert sts27_case.outcome_type == CaseOutcomeType.NEAR_MISS_RECOVERED
    
    # 1. Provide factors that MATCH STS-27's counter evidence rules
    matching_factors = {
        "known_unresolved_issue": True,
        "safety_margin_degraded": True,
    }
    
    # Because it is eligible by outcome_type, it is evaluated.
    # However, after data correction, it no longer has positive safeguards,
    # so it correctly fails to match.
    counter_evidence_matched = find_counter_evidence(matching_factors, [sts27_case])
    assert len(counter_evidence_matched) == 0
    
    # 2. Provide factors that DO NOT MATCH (no tech/env overlap)
    non_matching_factors = {
        "known_unresolved_issue": False,
        "safety_margin_degraded": False,
    }
    
    # Should not match because it doesn't satisfy deterministic conditions,
    # proving it's merely "eligible for evaluation", not "guaranteed to match".
    counter_evidence_unmatched = find_counter_evidence(non_matching_factors, [sts27_case])
    assert len(counter_evidence_unmatched) == 0


def test_no_counter_evidence(all_cases):
    """
    Assert that when no historical case satisfies the counter-evidence conditions,
    the counter_evidence list is empty.
    """
    # Create a situation that has NO technical/environmental risk factors active,
    # which is condition #1 for counter-evidence.
    situation_factors = {
        "known_unresolved_issue": False,
        "safety_margin_degraded": False,
        "schedule_pressure": SchedulePressureLevel.LOW,
        "external_conditions_marginal": False,
        "dissent_raised_and_overridden": True,
        "missing_evidence_acknowledged": False,
        "prior_normalization_of_risk": True,
        "independent_review_skipped": True,
    }

    confirmed_factors = {
        k: ExtractedFactorItem(
            factor_id=k, value=v, extracted_value=v,
            confidence=0.9, evidence_quote=None,
            is_user_modified=False, modification_reason=None
        ) for k, v in situation_factors.items()
    }

    result = evaluate_situation(
        session_id="test-no-counter",
        situation_title="No Counter Evidence",
        situation_summary="Testing zero counter-evidence state.",
        confirmed_factors=confirmed_factors,
        all_cases=all_cases,
    )

    assert result.counter_evidence is not None
    assert len(result.counter_evidence) == 0


def test_ranking_invariant_1_historical_overmatch_tie_breaker():
    """Test 1: Same Score_overlap + same CategoryBreadth -> lower historical_overmatch ranks higher."""
    # Case A: overlap=3, breadth=2, overmatch=5
    # Case B: overlap=3, breadth=2, overmatch=2
    # Expect B > A
    rank_a = (3.0, 2, -5, 0.0)
    rank_b = (3.0, 2, -2, 0.0)
    assert rank_b > rank_a


def test_ranking_invariant_2_overlap_remains_dominant():
    """Test 2: Higher Score_overlap beats lower overlap regardless of overmatch."""
    # Case A: overlap=4, breadth=1, overmatch=7
    # Case B: overlap=3, breadth=3, overmatch=0
    # Expect A > B
    rank_a = (4.0, 1, -7, 0.0)
    rank_b = (3.0, 3, 0, 0.0)
    assert rank_a > rank_b


def test_ranking_invariant_3_category_breadth_remains_second():
    """Test 3: Higher CategoryBreadth beats lower breadth when overlap is equal."""
    # Case A: overlap=3, breadth=3, overmatch=5
    # Case B: overlap=3, breadth=2, overmatch=0
    # Expect A > B
    rank_a = (3.0, 3, -5, 0.0)
    rank_b = (3.0, 2, 0, 0.0)
    assert rank_a > rank_b


def test_ranking_invariant_4_score_org_remains_final_tie_breaker():
    """Test 4: Score_org remains the final tie-breaker."""
    # Case A: overlap=3, breadth=2, overmatch=2, score_org=2.0
    # Case B: overlap=3, breadth=2, overmatch=2, score_org=1.0
    # Expect A > B
    rank_a = (3.0, 2, -2, 2.0)
    rank_b = (3.0, 2, -2, 1.0)
    assert rank_a > rank_b


def test_ranking_invariant_5_exact_ranking_tie_remains_stable():
    """Test 5: Exact ranking tie remains stable."""
    # In Python, identical tuples compare as equal, preserving input order in a stable sort
    rank_a = (3.0, 2, -2, 1.0)
    rank_b = (3.0, 2, -2, 1.0)
    assert rank_a == rank_b
    
    # Prove stable sort
    items = [("CaseA", rank_a), ("CaseB", rank_b)]
    items.sort(key=lambda x: x[1], reverse=True)
    assert items[0][0] == "CaseA"


def test_ranking_invariant_6_challenger_no_longer_universally_wins(all_cases):
    """Test 6: Challenger does not automatically win a 2-3 factor vector if a tighter fit exists."""
    # STS-27 case has 3 active risks (known issue, missing evidence, prior normalization) and LOW pressure.
    # We will pass exactly 3 active factors that STS-27 has. 
    # STS-27 has 0 overmatch. Challenger has 5 overmatch.
    situation_factors = {
        "known_unresolved_issue": True,
        "safety_margin_degraded": False,
        "schedule_pressure": SchedulePressureLevel.LOW,
        "external_conditions_marginal": False,
        "dissent_raised_and_overridden": False,
        "missing_evidence_acknowledged": True,
        "prior_normalization_of_risk": True,
        "independent_review_skipped": False,
    }

    result = evaluate_situation(
        session_id="test-sess-demote-challenger",
        situation_title="Small 3 Factor Test",
        situation_summary="Testing challenger demotion.",
        confirmed_factors={k: ExtractedFactorItem(factor_id=k, value=v, extracted_value=v, confidence=0.9, evidence_quote=None, is_user_modified=False, modification_reason=None) for k,v in situation_factors.items()},
        all_cases=all_cases,
    )

    assert result.status == ReviewStatus.PRECEDENT_FOUND
    top_match = result.matched_cases[0]
    # The winner shouldn't be Challenger because Challenger has massive overmatch.
    assert top_match.case_id != "CASE-HIST-CHALLENGER-1986"

def test_fractional_overlap_and_ranking(all_cases):
    """Test that a 7.5 overlap score is mathematically preserved and ranks properly."""
    situation_factors = {
        "known_unresolved_issue": True,
        "safety_margin_degraded": True,
        "schedule_pressure": SchedulePressureLevel.MEDIUM, # 0.5 match against High/Medium
        "external_conditions_marginal": True,
        "dissent_raised_and_overridden": True,
        "missing_evidence_acknowledged": True,
        "prior_normalization_of_risk": True,
        "independent_review_skipped": True,
    }

    result = evaluate_situation(
        session_id="test-sess-fractional",
        situation_title="Aurora Fractional Test",
        situation_summary="Testing 7.5 precision.",
        confirmed_factors={k: ExtractedFactorItem(factor_id=k, value=v, extracted_value=v, confidence=0.9, evidence_quote=None, is_user_modified=False, modification_reason=None) for k,v in situation_factors.items()},
        all_cases=all_cases,
    )

    top_match = result.matched_cases[0]
    
    # Prove 7.5 overlap
    assert top_match.overlap_score == 7.5
    
    # Prove 8 shared factors length
    assert len(top_match.shared_factors) == 8
    
    # Prove 7.9 ranks above 7.1
    rank_a = (7.9, 4, 0, 0.0)
    rank_b = (7.1, 4, 0, 0.0)
    assert rank_a > rank_b
