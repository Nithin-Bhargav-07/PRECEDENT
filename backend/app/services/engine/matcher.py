"""
PRECEDENT Deterministic Precedent Matching & Ranking Engine.
Strictly adheres to 03_REASONING_ENGINE.md.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.models.case import HistoricalCase
from app.models.factors import ExtractedFactorItem
from app.models.enums import (
    CaseOutcomeType,
    FactorCategoryID,
    ReviewStatus,
    SchedulePressureLevel,
)
from app.models.factors import (
    FACTOR_CATEGORY_MAP,
    FACTOR_DEFINITIONS,
    REQUIRED_FACTOR_IDS,
)
from app.models.review import (
    DifferingFactorDetail,
    PrecedentAnalysisResult,
    PrecedentMatch,
    SharedFactorDetail,
)
from app.services.engine.abstention import create_abstention_detail, should_abstain
from app.services.engine.confidence import calculate_confidence
from app.services.engine.counter_evidence import find_counter_evidence

FACTOR_LABEL_MAP: dict[str, str] = {f.id: f.label for f in FACTOR_DEFINITIONS}


def is_risk_active(value: Any) -> bool:
    """Return True if a factor value represents an active risk."""
    if isinstance(value, bool):
        return value
    if isinstance(value, SchedulePressureLevel):
        return value in {SchedulePressureLevel.MEDIUM, SchedulePressureLevel.HIGH}
    if isinstance(value, str):
        return value.upper() in {"MEDIUM", "HIGH", "TRUE"}
    return False


def match_factor_value(
    sit_val: bool | SchedulePressureLevel | None,
    case_val: bool | SchedulePressureLevel,
    factor_id: str,
) -> float:
    """
    Compute factor match value mu(S[f], H[f]) adhering to 03_REASONING_ENGINE.md §3.
    """
    if sit_val is None:
        return 0.0

    if factor_id == "schedule_pressure":
        sit_s = sit_val.value if isinstance(sit_val, SchedulePressureLevel) else str(sit_val).upper()
        case_s = case_val.value if isinstance(case_val, SchedulePressureLevel) else str(case_val).upper()

        if sit_s == "HIGH" and case_s == "HIGH":
            return 1.0
        if (sit_s, case_s) in {("MEDIUM", "HIGH"), ("HIGH", "MEDIUM"), ("MEDIUM", "MEDIUM")}:
            return 0.5
        return 0.0

    # Boolean factors: match strictly if both are True
    if sit_val is True and case_val is True:
        return 1.0
    return 0.0


def evaluate_single_case(
    situation_factors: dict[str, ExtractedFactorItem],
    case: HistoricalCase,
    total_active_situation_factors: int,
) -> PrecedentMatch:
    """Compare a single historical case against the situation factors."""
    shared_factors: list[SharedFactorDetail] = []
    differing_factors: list[DifferingFactorDetail] = []
    category_overlap: dict[FactorCategoryID, int] = {
        FactorCategoryID.CAT_TECH: 0,
        FactorCategoryID.CAT_ENV: 0,
        FactorCategoryID.CAT_HUMAN: 0,
        FactorCategoryID.CAT_PROCESS: 0,
    }

    raw_overlap_score = 0.0
    historical_overmatch = 0

    for factor_id in sorted(REQUIRED_FACTOR_IDS):
        sit_item = situation_factors.get(factor_id)
        sit_val = sit_item.value if sit_item else None
        case_evidence = case.factors.get(factor_id)
        if not case_evidence:
            continue

        case_val = case_evidence.value
        match_score = match_factor_value(sit_val, case_val, factor_id)
        cat_id_str = FACTOR_CATEGORY_MAP.get(factor_id, "CAT_TECH")
        cat_id = FactorCategoryID(cat_id_str)
        factor_label = FACTOR_LABEL_MAP.get(factor_id, factor_id)

        if match_score > 0.0:
            if sit_item and sit_item.evidence_quote:
                sit_evidence = f'"{sit_item.evidence_quote}"'
            else:
                sit_evidence = f"Active risk identified in current situation review ({sit_val})."

            raw_overlap_score += match_score
            category_overlap[cat_id] += 1
            shared_factors.append(
                SharedFactorDetail(
                    factor_id=factor_id,
                    factor_label=factor_label,
                    category_id=cat_id,
                    situation_evidence=sit_evidence,
                    historical_case_evidence=case_evidence.evidence_summary,
                )
            )
        else:
            sit_active = is_risk_active(sit_val)
            case_active = is_risk_active(case_val)
            if sit_active != case_active:
                if case_active and not sit_active:
                    historical_overmatch += 1
                    contrast_note = (
                        f"Documented in {case.case_name} ({case_evidence.evidence_summary}), "
                        "but not present in the current situation profile."
                    )
                else:
                    contrast_note = (
                        "Present in current situation review, but was not an active factor "
                        f"in {case.case_name}."
                    )

                differing_factors.append(
                    DifferingFactorDetail(
                        factor_id=factor_id,
                        factor_label=factor_label,
                        category_id=cat_id,
                        situation_value=sit_val if sit_val is not None else False,
                        case_value=case_val,
                        contrast_note=contrast_note,
                    )
                )

    return PrecedentMatch(
        case_id=case.id,
        case_name=case.case_name,
        mission_program=case.mission_program,
        incident_date=case.incident_date,
        outcome_type=case.outcome_type,
        verification_status=case.verification_status,
        situation_summary=case.situation_summary,
        overlap_score=raw_overlap_score,
        historical_overmatch=historical_overmatch,
        total_active_situation_factors=total_active_situation_factors,
        category_overlap=category_overlap,
        shared_factors=shared_factors,
        differing_factors=differing_factors,
        key_decision_points=case.key_decision_points,
        documented_contributing_factors=case.documented_contributing_factors,
        documented_safeguards=case.documented_safeguards,
        documented_response_actions=case.documented_response_actions,
        citation=case.citation,
    )


def compute_case_ranking_tuple(
    match: PrecedentMatch,
    case: HistoricalCase,
    situation_factors: dict[str, ExtractedFactorItem],
) -> tuple[float, int, int, float]:
    """
    Compute RankKey(H) = (Score_overlap, CategoryBreadth, Score_org)
    Adheres strictly to 03_REASONING_ENGINE.md §5.3.
    """
    score_overlap = float(match.overlap_score)
    category_breadth = sum(1 for count in match.category_overlap.values() if count > 0)

    # Organizational score from dissent and prior normalization
    dissent_item = situation_factors.get("dissent_raised_and_overridden")
    norm_item = situation_factors.get("prior_normalization_of_risk")
    
    dissent_match = match_factor_value(
        dissent_item.value if dissent_item else None,
        case.factors["dissent_raised_and_overridden"].value,
        "dissent_raised_and_overridden",
    )
    norm_match = match_factor_value(
        norm_item.value if norm_item else None,
        case.factors["prior_normalization_of_risk"].value,
        "prior_normalization_of_risk",
    )
    score_org = dissent_match + norm_match

    return (score_overlap, category_breadth, -match.historical_overmatch, score_org)


def evaluate_situation(
    session_id: str,
    situation_title: str,
    situation_summary: str,
    confirmed_factors: dict[str, ExtractedFactorItem],
    all_cases: list[HistoricalCase],
) -> PrecedentAnalysisResult:
    """
    Execute 100% deterministic precedent evaluation pipeline.
    Zero LLM calls exist in this entire function.
    """
    total_active_situation_factors = sum(
        1 for v in confirmed_factors.values() if is_risk_active(v.value)
    )

    # Filter failure cases for primary precedent matching
    failure_cases = [
        c
        for c in all_cases
        if c.outcome_type in {CaseOutcomeType.CATASTROPHIC_FAILURE, CaseOutcomeType.MISSION_LOSS}
    ]

    matched_candidates: list[tuple[PrecedentMatch, HistoricalCase, tuple[float, int, int, float]]] = []

    for case in failure_cases:
        match = evaluate_single_case(confirmed_factors, case, total_active_situation_factors)
        rank_key = compute_case_ranking_tuple(match, case, confirmed_factors)
        matched_candidates.append((match, case, rank_key))

    # Sort descending by RankKey
    matched_candidates.sort(key=lambda item: item[2], reverse=True)

    max_overlap_score = matched_candidates[0][2][0] if matched_candidates else 0.0

    # Abstention check
    is_abstaining, reason_code = should_abstain(max_overlap_score, total_active_situation_factors)

    flat_factors = {k: v.value for k, v in confirmed_factors.items()}
    counter_evidence = find_counter_evidence(flat_factors, all_cases)

    if is_abstaining:
        candidate_scores = [
            (item[0].case_id, item[0].case_name, item[2][0]) for item in matched_candidates
        ]
        abstention_detail = create_abstention_detail(
            reason_code=reason_code,
            highest_overlap_found=max_overlap_score,
            total_active_situation_factors=total_active_situation_factors,
            candidate_scores=candidate_scores,
        )
        confidence = calculate_confidence(
            overlap_score=0.0,
            total_active_situation_factors=total_active_situation_factors,
            category_breadth=0,
            shared_factor_ids=[],
            categories_present=[],
        )
        return PrecedentAnalysisResult(
            session_id=session_id,
            status=ReviewStatus.NO_STRONG_PRECEDENT,
            matched_cases=[],
            counter_evidence=counter_evidence,
            confidence=confidence,
            grounded_explanation=None,
            abstention_detail=abstention_detail,
            evaluated_at=datetime.now(timezone.utc),
        )

    # Top matches selection (including tie handling)
    top_rank_key = matched_candidates[0][2]
    top_score = top_rank_key[0]

    qualifying_matches: list[PrecedentMatch] = []
    for match, _, rank_key in matched_candidates:
        if rank_key == top_rank_key:
            match.is_primary = True
            qualifying_matches.append(match)
        elif rank_key[0] >= top_score - 0.5 and len(qualifying_matches) < 2 and rank_key[0] >= 2.0:
            qualifying_matches.append(match)

    is_tie = len([m for m in qualifying_matches if m.is_primary]) > 1
    for m in qualifying_matches:
        if m.is_primary:
            m.is_tied = is_tie

    top_match = qualifying_matches[0]
    top_shared_factor_ids = [sf.factor_id for sf in top_match.shared_factors]
    top_categories = [
        cid for cid, count in top_match.category_overlap.items() if count > 0
    ]

    confidence = calculate_confidence(
        overlap_score=float(top_match.overlap_score),
        total_active_situation_factors=total_active_situation_factors,
        category_breadth=len(top_categories),
        shared_factor_ids=top_shared_factor_ids,
        categories_present=top_categories,
    )

    return PrecedentAnalysisResult(
        session_id=session_id,
        status=ReviewStatus.PRECEDENT_FOUND,
        matched_cases=qualifying_matches,
        counter_evidence=counter_evidence,
        confidence=confidence,
        grounded_explanation=None,
        abstention_detail=None,
        is_exact_tie=is_tie,
        evaluated_at=datetime.now(timezone.utc),
    )
