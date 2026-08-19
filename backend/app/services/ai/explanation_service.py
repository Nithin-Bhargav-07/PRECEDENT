"""
Granite grounded explanation service.
Strictly adheres to 01_SYSTEM_ARCHITECTURE.md §4.2 and 02_DATA_MODEL.md §4.4.
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.core.config import settings
from app.core.logging import get_logger
from app.models.enums import ReviewStatus
from app.models.review import GroundedExplanation, PrecedentAnalysisResult
from app.services.ai.prompts import (
    EXPLANATION_SYSTEM_PROMPT,
    format_explanation_user_prompt,
)
from app.services.ai.providers import get_provider

logger = get_logger(__name__)


def generate_grounded_explanation(
    analysis_result: PrecedentAnalysisResult,
    situation_title: str,
    situation_summary: str,
) -> GroundedExplanation | None:
    """
    Generate a concise, grounded natural-language synthesis comparing current situation
    against the top deterministic matched precedent using IBM Granite.

    If the deterministic engine abstained (NO_STRONG_PRECEDENT), Granite is BYPASSED completely.
    """
    if analysis_result.status == ReviewStatus.NO_STRONG_PRECEDENT or not analysis_result.matched_cases:
        logger.info("Deterministic engine abstained; skipping Granite explanation generation")
        return None

    top_match = analysis_result.matched_cases[0]
    
    tied_names = [m.case_name for m in analysis_result.matched_cases if m.is_primary]
    
    display_case_name = ", ".join(tied_names) if len(tied_names) > 1 else top_match.case_name

    shared_factors_payload = [
        {
            "label": sf.factor_label,
            "situation_evidence": sf.situation_evidence,
            "historical_evidence": sf.historical_case_evidence,
        }
        for sf in top_match.shared_factors
    ]

    differing_factors_payload = [
        {
            "label": df.factor_label,
            "situation_value": str(df.situation_value),
            "case_value": str(df.case_value),
            "contrast_note": df.contrast_note,
        }
        for df in top_match.differing_factors
    ]

    counter_name = None
    counter_action = None
    if analysis_result.counter_evidence:
        counter_name = analysis_result.counter_evidence[0].case_name
        counter_action = analysis_result.counter_evidence[0].divergent_corrective_action

    user_prompt = format_explanation_user_prompt(
        situation_title=situation_title,
        situation_summary=situation_summary,
        case_name=display_case_name,
        incident_date=top_match.incident_date.isoformat(),
        citation_title=top_match.citation.report_title,
        shared_factors=shared_factors_payload,
        differing_factors=differing_factors_payload,
        counter_evidence_name=counter_name,
        counter_evidence_action=counter_action,
    )

    try:
        provider = get_provider()
        raw_narrative = provider.generate_text(
            prompt=user_prompt,
            system_prompt=EXPLANATION_SYSTEM_PROMPT,
        )
        narrative = raw_narrative.strip()
    except Exception as err:
        logger.error("Error generating explanation with AI provider: %s; using deterministic synthesis", err)
        narrative = (
            f"The current flight review shares {len(top_match.shared_factors)} critical risk factors with "
            f"{top_match.case_name} ({top_match.incident_date}). Documented causal findings from "
            f"'{top_match.citation.report_title}' highlight significant vulnerabilities in: "
            f"{', '.join(sf.factor_label for sf in top_match.shared_factors)}."
        )

    # Collect ground truth facts used for auditability
    grounded_facts = [
        f"Precedent Case: {display_case_name} ({top_match.incident_date})",
        f"Investigation: {top_match.citation.report_title}",
    ] + [
        f"Shared Risk [{sf.category_id.value}]: {sf.factor_label}"
        for sf in top_match.shared_factors
    ]

    return GroundedExplanation(
        grounded_narrative=narrative,
        grounded_facts_used=grounded_facts,
        model_id=settings.watsonx_model_id,
        generated_at=datetime.now(timezone.utc),
    )
