"""
watsonx.ai IBM Granite Client Wrapper.
Strictly adheres to 01_SYSTEM_ARCHITECTURE.md §4 and 02_DATA_MODEL.md.
"""

from __future__ import annotations

import json
import re
from typing import Any, Final

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def strip_granite_json_markdown(raw_output: str) -> str:
    """Extract raw JSON text if Granite wrapped output in markdown code blocks."""
    cleaned = raw_output.strip()
    # Match ```json ... ``` or ``` ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return cleaned


class WatsonxAPIError(Exception):
    """Exception raised when Granite API fails but is configured."""
    pass


class WatsonXClient:
    """Production client wrapper for IBM Granite via ibm-watsonx-ai SDK."""

    def __init__(self) -> None:
        self._model = None
        self._initialized = False
        self.is_configured = False

    def _get_model(self):
        """Lazy-initialize ModelInference when credentials are configured."""
        if self._initialized:
            return self._model

        api_key = settings.watsonx_api_key
        project_id = settings.watsonx_project_id
        url = settings.watsonx_url
        model_id = settings.watsonx_model_id

        if not api_key or not project_id:
            logger.info("watsonx.ai credentials not fully configured; using local deterministic AI fallback")
            self._initialized = True
            self.is_configured = False
            return None

        self.is_configured = True

        try:
            from ibm_watsonx_ai.foundation_models import ModelInference  # type: ignore
            from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams  # type: ignore

            credentials = {
                "url": url,
                "apikey": api_key,
            }
            params = {
                GenParams.DECODING_METHOD: "greedy",
                GenParams.TEMPERATURE: 0.0,
                GenParams.MAX_NEW_TOKENS: 1024,
                GenParams.MIN_NEW_TOKENS: 1,
            }
            self._model = ModelInference(
                model_id=model_id,
                credentials=credentials,
                project_id=project_id,
                params=params,
            )
            self._initialized = True
            logger.info("Successfully initialized watsonx.ai Granite model: %s", model_id)
            return self._model
        except Exception as err:
            logger.error("Failed to initialize watsonx.ai ModelInference (%s)", err)
            self._initialized = True
            raise WatsonxAPIError("Watsonx client initialization failed") from err

    def generate_text(self, prompt: str, system_prompt: str | None = None) -> str:
        """
        Generate text completion with Granite using temperature 0.0.
        Falls back to local synthesis if credentials are not configured.
        """
        model = self._get_model()
        
        if self.is_configured:
            if model is None:
                raise WatsonxAPIError("Watsonx model is not initialized properly")
            try:
                full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
                response = model.generate_text(prompt=full_prompt)
                return response
            except Exception as err:
                logger.error("Error invoking watsonx.ai Granite: %s", err)
                raise WatsonxAPIError("Granite generation failed") from err

        raise WatsonxAPIError("WatsonXClient is not configured")


watsonx_client: Final[WatsonXClient] = WatsonXClient()
