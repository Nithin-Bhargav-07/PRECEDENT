"""
Granite factor extraction service.
Strictly adheres to 01_SYSTEM_ARCHITECTURE.md §4.1 and 02_DATA_MODEL.md §4.3.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
from typing import Any
import uuid

from app.core.config import settings
from app.core.logging import get_logger
from app.models.enums import SchedulePressureLevel
from app.models.factors import (
    ExtractFactorsResponse,
    ExtractedFactorItem,
    REQUIRED_FACTOR_IDS,
)
from fastapi import HTTPException

from app.services.ai.prompts import (
    EXTRACTION_SYSTEM_PROMPT,
    format_extraction_user_prompt,
)
from app.services.ai.watsonx_client import (
    strip_granite_json_markdown,
)
from app.services.ai.providers import get_provider, AIProviderError

logger = get_logger(__name__)


def extract_factors_from_text(
    title: str,
    mission_context: str,
    raw_description: str,
    session_id: str | None = None,
) -> ExtractFactorsResponse:
    """
    Use IBM Granite to parse free-text flight review description into 8 structured factors.
    Granite is strictly restricted to extraction; it does not rank or score precedents.
    """
    user_prompt = format_extraction_user_prompt(title, mission_context, raw_description)

    try:
        provider = get_provider()
        raw_response = provider.generate_text(
            prompt=user_prompt,
            system_prompt=EXTRACTION_SYSTEM_PROMPT,
        )
        json_str = strip_granite_json_markdown(raw_response)
        parsed = json.loads(json_str)
        factors_data: dict[str, Any] = parsed.get("factors", parsed)
    except AIProviderError as err:
        logger.error("AI provider failure: %s", err)
        raise HTTPException(status_code=503, detail="AI Provider Error: Extraction service is unavailable") from err
    except json.JSONDecodeError as err:
        logger.error("Failed to parse extraction output as JSON: %s", err)
        if provider.name != "DEVELOPMENT FALLBACK":
            raise HTTPException(status_code=503, detail="AI Provider Error: Provider returned an invalid response") from err
        factors_data = {}
    except Exception as err:
        logger.error("Failed to parse Granite extraction output: %s; using default factor set", err)
        factors_data = {}

    extracted_items: dict[str, ExtractedFactorItem] = {}

    for factor_id in sorted(REQUIRED_FACTOR_IDS):
        factor_entry = factors_data.get(factor_id, {})
        raw_val = factor_entry.get("value")
        conf_val = factor_entry.get("confidence")
        confidence = float(conf_val) if conf_val is not None else None
        if confidence is not None:
            confidence = max(0.0, min(1.0, confidence))
        quote = factor_entry.get("evidence_quote")

        # Normalize value
        val: bool | SchedulePressureLevel
        if factor_id == "schedule_pressure":
            if isinstance(raw_val, str) and raw_val.upper() in {"LOW", "MEDIUM", "HIGH"}:
                val = SchedulePressureLevel(raw_val.upper())
            else:
                val = SchedulePressureLevel.LOW
        else:
            val = bool(raw_val) if raw_val is not None else False

        extracted_items[factor_id] = ExtractedFactorItem(
            factor_id=factor_id,
            value=val,
            extracted_value=val,
            confidence=confidence,
            evidence_quote=quote,
            is_user_modified=False,
            modification_reason=None,
        )

    return ExtractFactorsResponse(
        session_id=session_id or f"SESS-{uuid.uuid4().hex[:8].upper()}",
        factors=extracted_items,
        model_id=settings.watsonx_model_id,
        provider=provider.name,
        extracted_at=datetime.now(timezone.utc),
    )
