import pytest
import copy

from app.models.enums import CaseOutcomeType, CaseVerificationStatus, SchedulePressureLevel, ReviewStatus
from app.models.factors import ExtractedFactorItem
from app.services.engine.matcher import evaluate_situation
from app.services.engine.counter_evidence import find_counter_evidence
from app.repositories.case_repository import case_repository

@pytest.fixture
def base_cases():
    return case_repository.get_all_cases()

def test_user_submitted_case_excluded_from_ranking(base_cases):
    """Test A: USER_SUBMITTED case excluded from precedent ranking."""
    # Find a verified failure case to use as a baseline
    verified_case = next(c for c in base_cases if c.id == "CASE-HIST-CHALLENGER-1986")
    
    # Create a user-submitted case that is an even BETTER match
    user_submitted_case = copy.deepcopy(verified_case)
    user_submitted_case.id = "CASE-USER-SUBMITTED-1"
    user_submitted_case.case_name = "User Submitted Super Match"
    user_submitted_case.verification_status = CaseVerificationStatus.USER_SUBMITTED
    # Make it a "perfect" match by having no overmatch
    user_submitted_case.factors["dissent_raised_and_overridden"].value = False
    
    situation_factors = {
        "known_unresolved_issue": True,
        "safety_margin_degraded": True,
        "schedule_pressure": SchedulePressureLevel.HIGH,
        "external_conditions_marginal": True,
        "dissent_raised_and_overridden": False,
        "missing_evidence_acknowledged": True,
        "prior_normalization_of_risk": True,
        "independent_review_skipped": True,
    }
    confirmed_factors = {
        k: ExtractedFactorItem(factor_id=k, value=v, extracted_value=v, confidence=0.9)
        for k, v in situation_factors.items()
    }
    
    # Evaluate with BOTH cases
    test_cases = [verified_case, user_submitted_case]
    result = evaluate_situation("sess-1", "Test", "Test Summary", confirmed_factors, test_cases)
    
    # VERIFIED case remains eligible and should be the top match
    assert result.status == ReviewStatus.PRECEDENT_FOUND
    assert len(result.matched_cases) == 1
    assert result.matched_cases[0].case_id == "CASE-HIST-CHALLENGER-1986"
    
    # USER_SUBMITTED case does NOT appear
    assert not any(m.case_id == "CASE-USER-SUBMITTED-1" for m in result.matched_cases)

def test_user_submitted_case_excluded_from_counter_evidence(base_cases):
    """Test B: USER_SUBMITTED case excluded from counter-evidence."""
    verified_ce_case = next(c for c in base_cases if c.id == "CASE-HIST-APOLLO13-1970")
    
    user_submitted_ce = copy.deepcopy(verified_ce_case)
    user_submitted_ce.id = "CASE-USER-CE-1"
    user_submitted_ce.case_name = "User CE"
    user_submitted_ce.verification_status = CaseVerificationStatus.USER_SUBMITTED
    
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
    
    test_cases = [verified_ce_case, user_submitted_ce]
    matches = find_counter_evidence(situation_factors, test_cases)
    
    # VERIFIED case remains eligible
    assert len(matches) == 1
    assert matches[0].case_id == "CASE-HIST-APOLLO13-1970"
    
    # USER_SUBMITTED case is never returned
    assert not any(m.case_id == "CASE-USER-CE-1" for m in matches)

def test_verified_behavior_remains_unchanged(base_cases):
    """Test C: VERIFIED behavior remains unchanged."""
    verified_case = next(c for c in base_cases if c.id == "CASE-HIST-CHALLENGER-1986")
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
        k: ExtractedFactorItem(factor_id=k, value=v, extracted_value=v, confidence=0.9)
        for k, v in situation_factors.items()
    }
    result = evaluate_situation("sess-2", "Test", "Test Summary", confirmed_factors, [verified_case])
    assert result.status == ReviewStatus.PRECEDENT_FOUND
    assert result.matched_cases[0].case_id == "CASE-HIST-CHALLENGER-1986"

def test_existing_outcome_filtering_remains_intact(base_cases):
    """Test D: Existing outcome filtering remains intact."""
    # Near miss verified case should be excluded from precedent ranking
    verified_near_miss = next(c for c in base_cases if c.id == "CASE-HIST-STS27-1988")
    assert verified_near_miss.verification_status == CaseVerificationStatus.VERIFIED
    
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
        k: ExtractedFactorItem(factor_id=k, value=v, extracted_value=v, confidence=0.9)
        for k, v in situation_factors.items()
    }
    
    result = evaluate_situation("sess-3", "Test", "Test Summary", confirmed_factors, [verified_near_miss])
    assert result.status == ReviewStatus.NO_STRONG_PRECEDENT

def test_no_regression_to_abstention(base_cases):
    """Test E: No regression to abstention."""
    verified_case = next(c for c in base_cases if c.id == "CASE-HIST-CHALLENGER-1986")
    situation_factors = {
        "known_unresolved_issue": True,
        "safety_margin_degraded": True,
        "schedule_pressure": SchedulePressureLevel.LOW,
        "external_conditions_marginal": False,
        "dissent_raised_and_overridden": False,
        "missing_evidence_acknowledged": False,
        "prior_normalization_of_risk": False,
        "independent_review_skipped": False,
    }
    confirmed_factors = {
        k: ExtractedFactorItem(factor_id=k, value=v, extracted_value=v, confidence=0.9)
        for k, v in situation_factors.items()
    }
    
    # 2 active factors, but verified case overlaps only 1 (known_unresolved_issue is True in Challenger, safety_margin_degraded is True, wait, Challenger has both!
    # Let me make situation have something Challenger DOES NOT HAVE to force low overlap.
    situation_factors["missing_evidence_acknowledged"] = False
    situation_factors["prior_normalization_of_risk"] = False
    
    # Let's just pass an empty situation with 0 active factors to force sparse input abstention.
    situation_factors_zero = {
        "known_unresolved_issue": False,
        "safety_margin_degraded": False,
        "schedule_pressure": SchedulePressureLevel.LOW,
        "external_conditions_marginal": False,
        "dissent_raised_and_overridden": False,
        "missing_evidence_acknowledged": False,
        "prior_normalization_of_risk": False,
        "independent_review_skipped": False,
    }
    confirmed_factors_zero = {
        k: ExtractedFactorItem(factor_id=k, value=v, extracted_value=v, confidence=0.9)
        for k, v in situation_factors_zero.items()
    }

    result = evaluate_situation("sess-4", "Test", "Test Summary", confirmed_factors_zero, [verified_case])
    assert result.status == ReviewStatus.NO_STRONG_PRECEDENT
    assert result.abstention_detail is not None

def test_user_submitted_only_match_causes_abstention(base_cases):
    """Test 4: Important Edge Case - USER_SUBMITTED is the only match."""
    verified_case = next(c for c in base_cases if c.id == "CASE-HIST-CHALLENGER-1986")
    
    user_submitted_case = copy.deepcopy(verified_case)
    user_submitted_case.id = "CASE-USER-SUBMITTED-2"
    user_submitted_case.verification_status = CaseVerificationStatus.USER_SUBMITTED
    
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
        k: ExtractedFactorItem(factor_id=k, value=v, extracted_value=v, confidence=0.9)
        for k, v in situation_factors.items()
    }
    
    # Give the engine NO verified cases, only the perfectly matching user-submitted case
    result = evaluate_situation("sess-5", "Test", "Test Summary", confirmed_factors, [user_submitted_case])
    
    # Because there are no eligible cases to match, the engine should abstain
    assert result.status == ReviewStatus.NO_STRONG_PRECEDENT
    assert len(result.matched_cases) == 0
    assert result.abstention_detail is not None


def test_mission_loss_is_primary_eligible(base_cases):
    """Test: MISSION_LOSS cases are eligible for primary precedent matching."""
    # Find MCO case which is MISSION_LOSS
    mco_case = next(c for c in base_cases if c.id == "CASE-HIST-MCO-1999")
    assert mco_case.outcome_type == CaseOutcomeType.MISSION_LOSS
    assert mco_case.verification_status == CaseVerificationStatus.VERIFIED
    
    situation_factors = {
        "known_unresolved_issue": True,
        "safety_margin_degraded": True,
        "schedule_pressure": SchedulePressureLevel.HIGH,
        "external_conditions_marginal": False,
        "dissent_raised_and_overridden": True,
        "missing_evidence_acknowledged": True,
        "prior_normalization_of_risk": True,
        "independent_review_skipped": True,
    }
    confirmed_factors = {
        k: ExtractedFactorItem(factor_id=k, value=v, extracted_value=v, confidence=0.9)
        for k, v in situation_factors.items()
    }
    
    # Evaluate with just this case
    result = evaluate_situation("sess-mission-loss", "Test", "Test Summary", confirmed_factors, [mco_case])
    
    # Should be eligible and found
    assert result.status == ReviewStatus.PRECEDENT_FOUND
    assert len(result.matched_cases) == 1
    assert result.matched_cases[0].case_id == mco_case.id


def test_adverse_event_recovered_is_not_primary_eligible(base_cases):
    """Test: ADVERSE_EVENT_RECOVERED cases are NOT eligible for primary precedent ranking."""
    # Find Apollo 13 which is ADVERSE_EVENT_RECOVERED
    apollo_case = next(c for c in base_cases if c.id == "CASE-HIST-APOLLO13-1970")
    assert apollo_case.outcome_type == CaseOutcomeType.ADVERSE_EVENT_RECOVERED
    assert apollo_case.verification_status == CaseVerificationStatus.VERIFIED
    
    # Give it factors that would make it a strong mathematical match
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
        k: ExtractedFactorItem(factor_id=k, value=v, extracted_value=v, confidence=0.9)
        for k, v in situation_factors.items()
    }
    
    # Evaluate with just this case
    result = evaluate_situation("sess-adverse-event", "Test", "Test Summary", confirmed_factors, [apollo_case])
    
    # Since it is ineligible for primary matching, it should abstain when it's the only case
    assert result.status == ReviewStatus.NO_STRONG_PRECEDENT
    assert len(result.matched_cases) == 0
