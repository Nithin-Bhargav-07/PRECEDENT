"""GET /api/v1/ingestion — Historical case ingestion endpoints."""

from fastapi import APIRouter, HTTPException, status, UploadFile, File
from app.models.case_ingestion import DocumentExtractionResult
from app.services.ai.ingestion_service import extract_historical_case

router = APIRouter(prefix="/ingestion", tags=["ingestion"])

@router.post("/extract-pdf", response_model=DocumentExtractionResult)
async def extract_pdf(file: UploadFile = File(...)) -> DocumentExtractionResult:
    """Extract a historical case from an uploaded PDF file."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported for ingestion."
        )
        
    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty."
            )
        
        return extract_historical_case(content)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during extraction."
        )

from app.models.case_ingestion import AdmitCaseRequest
from app.models.case import HistoricalCase
from app.models.factors import FactorCaseEvidence
from app.repositories.case_repository import CaseRepository
import uuid

case_repository = CaseRepository()

@router.post("/admit", response_model=HistoricalCase)
def admit_case(request: AdmitCaseRequest) -> HistoricalCase:
    """Validate and admit a fully reviewed historical case."""
    
    # 1. Verify exactly 8 required factors exist
    from app.models.factors import REQUIRED_FACTOR_IDS
    required_keys = set(REQUIRED_FACTOR_IDS)
    provided_keys = set(request.resolved_factors.keys())
    if required_keys != provided_keys:
        raise HTTPException(status_code=422, detail="Exactly 8 canonical factors must be provided.")
        
    final_factors = {}
    for factor_id, item in request.resolved_factors.items():
        # 2. Verify factor has a valid canonical value (no nulls)
        if item.candidate_value is None:
            raise HTTPException(status_code=422, detail=f"Factor {factor_id} cannot be null.")
            
        evidence_summary = item.evidence.quote if item.evidence else "Confirmed by engineer"
        source_page = item.evidence.source_page if item.evidence else None
        
        final_factors[factor_id] = FactorCaseEvidence(
            value=item.candidate_value,
            evidence_summary=evidence_summary,
            source_page=source_page
        )

    # 3. Construct the canonical HistoricalCase
    from app.models.case import Citation
    import time
    import uuid
    
    case_id = f"CASE-USER-{uuid.uuid4().hex[:8].upper()}-{int(time.time())}"
    
    case = HistoricalCase(
        id=case_id,
        case_name=request.extraction_result.title,
        mission_program=request.extraction_result.mission_program,
        incident_date=request.extraction_result.incident_date,
        outcome_type=request.extraction_result.outcome_type,
        verification_status="USER_SUBMITTED",
        situation_summary=request.extraction_result.situation_summary,
        factors=final_factors,
        key_decision_points=request.extraction_result.key_decision_points,
        documented_contributing_factors=request.extraction_result.documented_contributing_factors,
        documented_safeguards=request.extraction_result.documented_safeguards,
        documented_response_actions=request.extraction_result.documented_response_actions,
        citation=Citation(
            id=f"CIT-USER-{int(time.time())}",
            report_title=request.extraction_result.citation_title,
            issuing_body=request.extraction_result.issuing_body,
            publication_year=request.extraction_result.publication_year,
            key_excerpts=[]
        ),
        secondary_citations=[]
    )
    
    # 4. Persist it through the existing case repository
    try:
        case_repository.save_case(case)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
        
    return case
