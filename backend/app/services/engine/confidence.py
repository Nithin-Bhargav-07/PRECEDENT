"""
PRECEDENT Deterministic Confidence Assessment Service.
Strictly adheres to 03_REASONING_ENGINE.md §6.
"""

from __future__ import annotations

from app.models.enums import ConfidenceLevel, FactorCategoryID
from app.models.factors import FACTOR_DEFINITIONS
from app.models.review import ConfidenceAssessment

FACTOR_LABEL_MAP: dict[str, str] = {f.id: f.label for f in FACTOR_DEFINITIONS}
CATEGORY_NAME_MAP: dict[str, str] = {
    FactorCategoryID.CAT_TECH: "Technical State",
    FactorCategoryID.CAT_ENV: "Decision Environment",
    FactorCategoryID.CAT_HUMAN: "Human Factors",
    FactorCategoryID.CAT_PROCESS: "Process Quality",
}


def calculate_confidence(
    overlap_score: float,
    total_active_situation_factors: int,
    category_breadth: int,
    shared_factor_ids: list[str],
    categories_present: list[FactorCategoryID],
) -> ConfidenceAssessment:
    """
    Compute discrete confidence level and plain-language rationale.
    Adheres strictly to the confidence determination table in 03_REASONING_ENGINE.md §6.
    """
    if total_active_situation_factors == 0 or overlap_score <= 0.0:
        level = ConfidenceLevel.NONE
    elif (overlap_score >= 3.0 and category_breadth >= 2) or (
        overlap_score >= 2.0 and overlap_score >= total_active_situation_factors and total_active_situation_factors > 0
    ):
        level = ConfidenceLevel.HIGH
    elif (overlap_score >= 2.0 and category_breadth >= 1) or (overlap_score >= 1.5 and category_breadth >= 2):
        level = ConfidenceLevel.MEDIUM
    elif overlap_score >= 1.0:
        level = ConfidenceLevel.LOW
    else:
        level = ConfidenceLevel.NONE

    # Plain-language deterministic rationale synthesis
    shared_labels = [FACTOR_LABEL_MAP.get(fid, fid) for fid in shared_factor_ids]
    category_names = [CATEGORY_NAME_MAP.get(cid, str(cid)) for cid in categories_present]

    overlap_metric_str = f"{int(overlap_score) if overlap_score.is_integer() else overlap_score}/{total_active_situation_factors} factors matched"

    if level == ConfidenceLevel.HIGH:
        if shared_labels and category_names:
            rationale = (
                f"High confidence — {int(overlap_score) if overlap_score.is_integer() else overlap_score} of "
                f"{total_active_situation_factors} active decision factors match: "
                f"{', '.join(shared_labels)} across {', '.join(category_names)}."
            )
        else:
            rationale = f"High confidence — strong multi-category factor alignment ({overlap_metric_str})."
    elif level == ConfidenceLevel.MEDIUM:
        rationale = (
            f"Medium confidence — {int(overlap_score) if overlap_score.is_integer() else overlap_score} of "
            f"{total_active_situation_factors} active decision factors match: "
            f"{', '.join(shared_labels)} across {', '.join(category_names)}."
        )
    elif level == ConfidenceLevel.LOW:
        rationale = (
            f"Low confidence — weak single-factor signal ({overlap_metric_str}): "
            f"{', '.join(shared_labels) if shared_labels else 'insufficient alignment'}."
        )
    else:
        rationale = "No confidence — zero shared risk factors detected between current situation and historical precedents."

    return ConfidenceAssessment(
        level=level,
        overlap_metric=overlap_metric_str,
        matched_critical_factors_count=int(overlap_score),
        total_critical_factors_count=total_active_situation_factors,
        rationale=rationale,
    )
