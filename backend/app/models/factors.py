"""
PRECEDENT 8-factor schema definitions, categories, and factor-related models.
Strictly adheres to 02_DATA_MODEL.md.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Final

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import FactorCategoryID, SchedulePressureLevel

REQUIRED_FACTOR_IDS: Final[frozenset[str]] = frozenset(
    {
        "known_unresolved_issue",
        "safety_margin_degraded",
        "schedule_pressure",
        "external_conditions_marginal",
        "dissent_raised_and_overridden",
        "missing_evidence_acknowledged",
        "prior_normalization_of_risk",
        "independent_review_skipped",
    }
)

FACTOR_CATEGORY_MAP: Final[dict[str, str]] = {
    "known_unresolved_issue": "CAT_TECH",
    "safety_margin_degraded": "CAT_TECH",
    "schedule_pressure": "CAT_ENV",
    "external_conditions_marginal": "CAT_ENV",
    "dissent_raised_and_overridden": "CAT_HUMAN",
    "missing_evidence_acknowledged": "CAT_HUMAN",
    "prior_normalization_of_risk": "CAT_PROCESS",
    "independent_review_skipped": "CAT_PROCESS",
}





class FactorValueType(str, Enum):
    BOOLEAN = "boolean"
    ENUM_SCHEDULE = "enum_schedule"


class FactorDefinition(BaseModel):
    """Fixed ontology entry for one of the 8 decision factors."""

    model_config = ConfigDict(extra="forbid")

    id: str
    category_id: FactorCategoryID
    category_name: str
    label: str
    description: str
    diagnostic_question: str
    value_type: FactorValueType


class FactorSchemaEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    label: str
    type: str
    allowed_values: list[SchedulePressureLevel] | None = None
    diagnostic_question: str


class FactorCategoryGroup(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: FactorCategoryID
    name: str
    factors: list[FactorSchemaEntry]


class FactorSchemaDefinition(BaseModel):
    """Root schema loaded from data/schema.json."""

    model_config = ConfigDict(extra="forbid")

    version: str
    categories: list[FactorCategoryGroup]


class FactorCaseEvidence(BaseModel):
    """Historical evidence attached to a single factor on a case."""

    model_config = ConfigDict(extra="forbid")

    value: bool | SchedulePressureLevel
    evidence_summary: str = Field(..., min_length=5)
    source_quote: str | None = None
    source_page: int | None = None


class ExtractedFactorItem(BaseModel):
    """Human-in-the-loop factor extraction state for one factor."""

    model_config = ConfigDict(extra="forbid")

    factor_id: str
    value: bool | SchedulePressureLevel
    extracted_value: bool | SchedulePressureLevel | None = None
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    evidence_quote: str | None = None
    is_user_modified: bool = False
    modification_reason: str | None = None

    @field_validator("factor_id")
    @classmethod
    def validate_factor_id(cls, value: str) -> str:
        if value not in REQUIRED_FACTOR_IDS:
            raise ValueError(f"Unknown factor_id: {value}")
        return value


class ExtractedFactorSet(BaseModel):
    """Complete set of extracted factors for a review session."""

    model_config = ConfigDict(extra="forbid")

    factors: dict[str, ExtractedFactorItem]
    extraction_model: str | None = None
    provider: str | None = None
    extracted_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("factors")
    @classmethod
    def validate_factor_keys(
        cls, value: dict[str, ExtractedFactorItem]
    ) -> dict[str, ExtractedFactorItem]:
        return validate_factor_map_keys(value)


class ExtractFactorsResponse(BaseModel):
    """Response payload after Granite factor extraction."""

    model_config = ConfigDict(extra="forbid")

    session_id: str
    factors: dict[str, ExtractedFactorItem]
    model_id: str
    provider: str
    extracted_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("factors")
    @classmethod
    def validate_factor_keys(
        cls, value: dict[str, ExtractedFactorItem]
    ) -> dict[str, ExtractedFactorItem]:
        return validate_factor_map_keys(value)


def validate_factor_map_keys(factors: dict[str, Any]) -> dict[str, Any]:
    """Reject factor keys outside the fixed 8-factor schema."""
    unknown = set(factors.keys()) - REQUIRED_FACTOR_IDS
    if unknown:
        raise ValueError(f"Unknown factor keys: {sorted(unknown)}")
    return factors


def validate_factor_values(
    factors: dict[str, bool | SchedulePressureLevel],
) -> dict[str, bool | SchedulePressureLevel]:
    """Validate whitelisted factor keys and value types."""
    validated = validate_factor_map_keys(factors)
    coerced: dict[str, bool | SchedulePressureLevel] = {}
    for factor_id, factor_value in validated.items():
        if factor_id == "schedule_pressure":
            if isinstance(factor_value, SchedulePressureLevel):
                coerced[factor_id] = factor_value
            elif factor_value in {"LOW", "MEDIUM", "HIGH"}:
                coerced[factor_id] = SchedulePressureLevel(factor_value)
            else:
                raise ValueError("schedule_pressure must be LOW, MEDIUM, or HIGH")
        elif isinstance(factor_value, bool):
            coerced[factor_id] = factor_value
        else:
            raise ValueError(f"{factor_id} must be a boolean")
    return coerced


def strip_granite_json_markdown(raw_response: str) -> str:
    """Remove markdown code fences from Granite JSON before schema ingestion."""
    stripped = raw_response.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        stripped = "\n".join(lines).strip()
    return stripped


# Canonical factor definitions from 02_DATA_MODEL.md §3
FACTOR_DEFINITIONS: Final[list[FactorDefinition]] = [
    FactorDefinition(
        id="known_unresolved_issue",
        category_id=FactorCategoryID.CAT_TECH,
        category_name="Technical State",
        label="Known Unresolved Issue",
        description=(
            "Known, recurring, or unresolved hardware/software anomaly present in the system."
        ),
        diagnostic_question=(
            "Is there a known, recurring, or unresolved hardware/software anomaly "
            "present in the system?"
        ),
        value_type=FactorValueType.BOOLEAN,
    ),
    FactorDefinition(
        id="safety_margin_degraded",
        category_id=FactorCategoryID.CAT_TECH,
        category_name="Technical State",
        label="Safety Margin Degraded",
        description=(
            "System operating outside tested thermal, structural, or environmental safety margins."
        ),
        diagnostic_question=(
            "Is the system operating outside tested thermal, structural, "
            "or environmental safety margins?"
        ),
        value_type=FactorValueType.BOOLEAN,
    ),
    FactorDefinition(
        id="schedule_pressure",
        category_id=FactorCategoryID.CAT_ENV,
        category_name="Decision Environment",
        label="Schedule Pressure",
        description=(
            "External launch window, commercial, or public schedule pressure "
            "influencing the review."
        ),
        diagnostic_question=(
            "Is there external launch window, commercial, or public schedule pressure "
            "influencing the review?"
        ),
        value_type=FactorValueType.ENUM_SCHEDULE,
    ),
    FactorDefinition(
        id="external_conditions_marginal",
        category_id=FactorCategoryID.CAT_ENV,
        category_name="Decision Environment",
        label="External Conditions Marginal",
        description=(
            "Environmental conditions near or outside design limits."
        ),
        diagnostic_question=(
            "Are environmental conditions (ambient temp, sea state, space weather) "
            "near or outside design limits?"
        ),
        value_type=FactorValueType.BOOLEAN,
    ),
    FactorDefinition(
        id="dissent_raised_and_overridden",
        category_id=FactorCategoryID.CAT_HUMAN,
        category_name="Human Factors",
        label="Dissent Raised and Overridden",
        description=(
            "Engineering dissent was raised and subsequently overruled."
        ),
        diagnostic_question=(
            "Did an engineering team, subsystem lead, or contractor raise formal "
            "or informal dissent that was overruled?"
        ),
        value_type=FactorValueType.BOOLEAN,
    ),
    FactorDefinition(
        id="missing_evidence_acknowledged",
        category_id=FactorCategoryID.CAT_HUMAN,
        category_name="Human Factors",
        label="Missing Evidence Acknowledged",
        description=(
            "Board acknowledged missing telemetry or inconclusive data but proceeded."
        ),
        diagnostic_question=(
            "Did the board acknowledge missing telemetry, inconclusive test data, "
            "or unproven assumptions but proceed anyway?"
        ),
        value_type=FactorValueType.BOOLEAN,
    ),
    FactorDefinition(
        id="prior_normalization_of_risk",
        category_id=FactorCategoryID.CAT_PROCESS,
        category_name="Process Quality",
        label="Prior Normalization of Risk",
        description=(
            "Similar anomaly occurred on prior flights and was accepted as acceptable risk."
        ),
        diagnostic_question=(
            'Has this identical or similar anomaly occurred on prior flights and been '
            'accepted as "acceptable risk"?'
        ),
        value_type=FactorValueType.BOOLEAN,
    ),
    FactorDefinition(
        id="independent_review_skipped",
        category_id=FactorCategoryID.CAT_PROCESS,
        category_name="Process Quality",
        label="Independent Review Skipped",
        description=(
            "Independent technical review or mandatory safety escalation was bypassed."
        ),
        diagnostic_question=(
            "Was an independent technical review, peer verification, or mandatory "
            "safety escalation bypassed or accelerated?"
        ),
        value_type=FactorValueType.BOOLEAN,
    ),
]
