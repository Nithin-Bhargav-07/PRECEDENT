"""
PRECEDENT Counter-Evidence Discovery Service.
Strictly adheres to 03_REASONING_ENGINE.md §9.
"""

from __future__ import annotations

from app.models.case import HistoricalCase
from app.models.enums import CaseOutcomeType, SchedulePressureLevel
from app.models.factors import FACTOR_CATEGORY_MAP, FACTOR_DEFINITIONS
from app.models.review import CounterEvidenceMatch

FACTOR_LABEL_MAP: dict[str, str] = {f.id: f.label for f in FACTOR_DEFINITIONS}


def find_counter_evidence(
    situation_factors: dict[str, bool | SchedulePressureLevel],
    candidate_cases: list[HistoricalCase],
) -> list[CounterEvidenceMatch]:
    """
    Query counter-evidence case library for missions that faced similar technical/environmental
    risks but safely recovered due to positive engineering safeguards.
    """
    matches: list[CounterEvidenceMatch] = []

    for case in candidate_cases:
        # Must be an adverse-event or near-miss recovered mission
        if case.outcome_type not in {CaseOutcomeType.ADVERSE_EVENT_RECOVERED, CaseOutcomeType.NEAR_MISS_RECOVERED}:
            continue

        shared_initial_risks: list[str] = []

        # 1. Initial Risk Overlap Condition: check Technical (CAT_TECH) & Environment (CAT_ENV) factors
        for factor_id, situation_val in situation_factors.items():
            category = FACTOR_CATEGORY_MAP.get(factor_id)
            if category not in {"CAT_TECH", "CAT_ENV"}:
                continue

            case_evidence = case.factors.get(factor_id)
            if not case_evidence:
                continue

            case_val = case_evidence.value
            # Check match
            is_match = False
            if factor_id == "schedule_pressure":
                if situation_val in {"MEDIUM", "HIGH", SchedulePressureLevel.MEDIUM, SchedulePressureLevel.HIGH}:
                    if case_val in {"MEDIUM", "HIGH", SchedulePressureLevel.MEDIUM, SchedulePressureLevel.HIGH}:
                        is_match = True
            elif situation_val is True and case_val is True:
                is_match = True

            if is_match:
                shared_initial_risks.append(FACTOR_LABEL_MAP.get(factor_id, factor_id))

        if not shared_initial_risks:
            continue

        # 2. Divergent Safe Safeguard Condition:
        # Check that independent review was NOT skipped or dissent was NOT overruled
        indep_review = case.factors.get("independent_review_skipped")
        dissent_override = case.factors.get("dissent_raised_and_overridden")

        has_positive_safeguard = (
            (indep_review is not None and indep_review.value is False)
            or (dissent_override is not None and dissent_override.value is False)
        )

        if not has_positive_safeguard:
            continue

        # Synthesize divergent corrective action summary from case evidence & decision points
        safeguard_notes: list[str] = []
        if indep_review and indep_review.value is False:
            safeguard_notes.append(f"Independent review conducted ({indep_review.evidence_summary})")
        if dissent_override and dissent_override.value is False:
            safeguard_notes.append(f"Engineering dissent addressed collaboratively ({dissent_override.evidence_summary})")

        divergent_action = (
            "; ".join(safeguard_notes)
            if safeguard_notes
            else "Independent review and verification protocols were executed prior to critical decision."
        )

        matches.append(
            CounterEvidenceMatch(
                case_id=case.id,
                case_name=case.case_name,
                mission_program=case.mission_program,
                incident_date=case.incident_date,
                shared_risk_factors=shared_initial_risks,
                divergent_corrective_action=divergent_action,
                documented_contributing_factors=case.documented_contributing_factors,
                documented_safeguards=case.documented_safeguards,
                documented_response_actions=case.documented_response_actions,
                citation=case.citation,
            )
        )

    return matches
