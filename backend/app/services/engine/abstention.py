"""
PRECEDENT Abstention Gating Service.
Strictly adheres to 03_REASONING_ENGINE.md §10.
"""

from __future__ import annotations

from app.core.config import settings
from app.models.review import AbstentionDetail, ClosestCandidateCase


def should_abstain(
    max_overlap_score: float,
    total_active_situation_factors: int,
) -> tuple[bool, str]:
    """
    Determine whether to trigger explicit abstention.
    Returns (is_abstaining, reason_code).
    """
    if total_active_situation_factors == 0:
        return True, "SPARSE_INPUT_DATA"

    threshold = (
        settings.abstention_threshold_single_factor
        if total_active_situation_factors == 1
        else settings.abstention_threshold
    )

    if max_overlap_score < threshold:
        return True, "INSUFFICIENT_FACTOR_OVERLAP"

    return False, ""


def create_abstention_detail(
    reason_code: str,
    highest_overlap_found: float,
    total_active_situation_factors: int,
    candidate_scores: list[tuple[str, str, float]],
) -> AbstentionDetail:
    """Construct structured abstention payload."""
    threshold = (
        settings.abstention_threshold_single_factor
        if total_active_situation_factors == 1
        else settings.abstention_threshold
    )

    closest_candidates = [
        ClosestCandidateCase(
            case_id=case_id,
            case_name=case_name,
            overlap_score=score,
        )
        for case_id, case_name, score in candidate_scores[:3]
        if score > 0
    ]

    if reason_code == "SPARSE_INPUT_DATA":
        message = (
            "Nominal situation profile: Zero active risk factors were selected or identified. "
            "PRECEDENT abstains from matching to avoid false positive precedent warnings."
        )
    else:
        message = (
            "No documented historical aerospace incident shares significant causal factors with the "
            "current situation profile. PRECEDENT abstains from declaring a strong precedent."
        )

    return AbstentionDetail(
        is_abstaining=True,
        reason_code="SPARSE_INPUT_DATA" if reason_code == "SPARSE_INPUT_DATA" else "INSUFFICIENT_FACTOR_OVERLAP",
        message=message,
        highest_overlap_found=int(highest_overlap_found),
        minimum_threshold_required=int(threshold),
        closest_candidate_cases=closest_candidates,
    )
