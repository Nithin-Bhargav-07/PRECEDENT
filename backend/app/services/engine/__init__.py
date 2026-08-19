"""PRECEDENT Deterministic Reasoning Engine Package."""

from app.services.engine.abstention import create_abstention_detail, should_abstain
from app.services.engine.confidence import calculate_confidence
from app.services.engine.counter_evidence import find_counter_evidence
from app.services.engine.matcher import (
    compute_case_ranking_tuple,
    evaluate_single_case,
    evaluate_situation,
    is_risk_active,
    match_factor_value,
)

__all__ = [
    "calculate_confidence",
    "compute_case_ranking_tuple",
    "create_abstention_detail",
    "evaluate_single_case",
    "evaluate_situation",
    "find_counter_evidence",
    "is_risk_active",
    "match_factor_value",
    "should_abstain",
]
