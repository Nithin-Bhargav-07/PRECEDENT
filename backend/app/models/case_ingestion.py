"""
Ingestion models for extracting structured historical cases from documents.
"""

from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import SchedulePressureLevel

class IngestedFactorEvidence(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    quote: str = Field(..., min_length=1)
    source_page: int | None = None

class IngestedFactorItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    factor_id: str
    candidate_value: bool | SchedulePressureLevel | None = None
    evidence: IngestedFactorEvidence | None = None

class DocumentExtractionResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    title: str = Field(..., min_length=3, max_length=150)
    incident_date: str = Field(..., description="YYYY-MM-DD or YYYY format")
    mission_program: str = Field(..., min_length=2, max_length=100)
    outcome_type: str
    situation_summary: str = Field(..., min_length=20)
    
    key_decision_points: list[dict] = Field(default_factory=list)
    documented_contributing_factors: list[str] = Field(default_factory=list)
    documented_safeguards: list[str] = Field(default_factory=list)
    documented_response_actions: list[str] = Field(default_factory=list)
    
    citation_title: str
    issuing_body: str
    publication_year: int
    
    factors: dict[str, IngestedFactorItem]

class AdmitCaseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    extraction_result: DocumentExtractionResult
    resolved_factors: dict[str, IngestedFactorItem]
