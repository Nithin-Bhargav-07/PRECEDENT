import json
from io import BytesIO
import pypdf
from app.core.logging import get_logger
from app.services.ai.providers import get_provider, AIProviderError
from app.services.ai.ingestion_prompts import (
    HISTORICAL_CASE_EXTRACTION_SYSTEM_PROMPT,
    format_historical_case_extraction_prompt,
)
from app.services.ai.watsonx_client import strip_granite_json_markdown
from app.models.case_ingestion import DocumentExtractionResult

logger = get_logger(__name__)

def parse_pdf(file_bytes: bytes) -> str:
    """Parse a PDF file and return text with page markers."""
    try:
        reader = pypdf.PdfReader(BytesIO(file_bytes))
        text_chunks = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                text_chunks.append(f"[PAGE {i + 1}]\n{text}")
        return "\n\n".join(text_chunks)
    except Exception as e:
        logger.error(f"Failed to parse PDF: {e}")
        raise ValueError("Could not parse the provided PDF file.") from e

def extract_historical_case(file_bytes: bytes) -> DocumentExtractionResult:
    """Parse PDF and use Granite to extract historical case structured data."""
    text = parse_pdf(file_bytes)
    if not text.strip():
        raise ValueError("PDF contains no extractable text.")
        
    prompt = format_historical_case_extraction_prompt(text)
    
    try:
        provider = get_provider()
        raw_response = provider.generate_text(
            prompt=prompt,
            system_prompt=HISTORICAL_CASE_EXTRACTION_SYSTEM_PROMPT,
        )
        json_str = strip_granite_json_markdown(raw_response)
        parsed = json.loads(json_str)
        return DocumentExtractionResult.model_validate(parsed)
    except AIProviderError as e:
        logger.error(f"AI Provider error during ingestion: {e}")
        raise ValueError("Extraction service is currently unavailable.") from e
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Granite output as JSON: {raw_response}")
        raise ValueError("Failed to parse extraction results.") from e
    except Exception as e:
        logger.error(f"Unexpected error during extraction: {e}")
        raise ValueError(f"An unexpected error occurred: {e}") from e
