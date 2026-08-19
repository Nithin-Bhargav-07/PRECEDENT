import json
import abc
import httpx
from typing import Any

from app.core.config import settings
from app.core.logging import get_logger
from app.services.ai.watsonx_client import watsonx_client, WatsonxAPIError

logger = get_logger(__name__)

class AIProviderError(Exception):
    """Base exception for all AI provider errors."""
    pass

class GeminiAPIError(AIProviderError):
    pass

class GraniteAPIError(AIProviderError):
    pass

class GroqAPIError(AIProviderError):
    pass

class AIExtractionProvider(abc.ABC):
    @property
    @abc.abstractmethod
    def name(self) -> str:
        """The display name of the provider."""
        pass
        
    @abc.abstractmethod
    def generate_text(self, prompt: str, system_prompt: str | None = None) -> str:
        """Generate a response given a prompt and system prompt."""
        pass


class GraniteProvider(AIExtractionProvider):
    @property
    def name(self) -> str:
        return "IBM Granite"

    def generate_text(self, prompt: str, system_prompt: str | None = None) -> str:
        if not watsonx_client.is_configured:
            # If not configured but selected, we shouldn't fail silently if explicitly selected,
            if not settings.watsonx_api_key or not settings.watsonx_project_id:
                raise GraniteAPIError("Granite credentials missing")
            
        try:
            return watsonx_client.generate_text(prompt, system_prompt)
        except WatsonxAPIError as err:
            raise GraniteAPIError(str(err)) from err
        except Exception as err:
            raise GraniteAPIError("Unexpected Granite error") from err


class GeminiProvider(AIExtractionProvider):
    @property
    def name(self) -> str:
        return "Gemini"

    def generate_text(self, prompt: str, system_prompt: str | None = None) -> str:
        api_key = settings.gemini_api_key
        model_id = settings.gemini_model_id
        if not api_key:
            raise GeminiAPIError("Gemini credentials missing")
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={api_key}"
        
        system_instruction = system_prompt if system_prompt else ""
        payload = {
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "response_mime_type": "application/json",
            }
        }
        
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
                
                try:
                    text_out = data["candidates"][0]["content"]["parts"][0]["text"]
                    return text_out
                except (KeyError, IndexError) as e:
                    logger.error("Unexpected Gemini response structure: %s", data)
                    raise GeminiAPIError("Invalid response structure from Gemini") from e
                    
        except httpx.HTTPStatusError as e:
            logger.error("Gemini HTTP error: %s", e.response.text)
            raise GeminiAPIError(f"Gemini API returned status {e.response.status_code}") from e
        except Exception as e:
            logger.error("Gemini request failed: %s", e)
            raise GeminiAPIError("Failed to communicate with Gemini API") from e


class GroqProvider(AIExtractionProvider):
    @property
    def name(self) -> str:
        return "Groq"

    def generate_text(self, prompt: str, system_prompt: str | None = None) -> str:
        api_key = settings.groq_api_key
        model_id = settings.groq_model_id
        if not api_key:
            raise GroqAPIError("Groq credentials missing")
            
        url = "https://api.groq.com/openai/v1/chat/completions"
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": model_id,
            "messages": messages,
            "temperature": 0.0,
            "response_format": {"type": "json_object"}
        }
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                
                try:
                    text_out = data["choices"][0]["message"]["content"]
                    return text_out
                except (KeyError, IndexError) as e:
                    logger.error("Unexpected Groq response structure: %s", data)
                    raise GroqAPIError("Invalid response structure from Groq") from e
                    
        except httpx.HTTPStatusError as e:
            logger.error("Groq HTTP error: %s", e.response.text)
            raise GroqAPIError(f"Groq API returned status {e.response.status_code}") from e
        except Exception as e:
            logger.error("Groq request failed: %s", e)
            raise GroqAPIError("Failed to communicate with Groq API") from e


def simulate_development_fallback_response(prompt: str, system_prompt: str | None = None) -> str:
    """Local fallback when AI is unconfigured."""
    if system_prompt and "decision factors" in system_prompt.lower():
        # Factor extraction prompt
        p_lower = prompt.lower()
        return json.dumps({
            "factors": {
                "known_unresolved_issue": {
                    "value": any(w in p_lower for w in ["unresolved", "anomaly", "known issue", "recurring", "leak", "erosion", "damaged", "blow-by"]),
                    "confidence": None,
                    "evidence_quote": "Extracted from situation review text."
                },
                "safety_margin_degraded": {
                    "value": any(w in p_lower for w in ["margin", "operating outside", "degraded", "limit", "thermal limit", "stress"]),
                    "confidence": None,
                    "evidence_quote": "Operating outside nominal safety envelope."
                },
                "schedule_pressure": {
                    "value": "HIGH" if any(w in p_lower for w in ["schedule", "cadence", "deadline", "launch window", "timeline pressure"]) else "LOW",
                    "confidence": None,
                    "evidence_quote": "Launch schedule constraints."
                },
                "external_conditions_marginal": {
                    "value": any(w in p_lower for w in ["weather", "temperature", "cold", "wind", "ice", "freezing", "sea state", "29°f"]),
                    "confidence": None,
                    "evidence_quote": "Environmental conditions near or exceeding limits."
                },
                "dissent_raised_and_overridden": {
                    "value": any(w in p_lower for w in ["dissent", "overruled", "objected", "contested", "concerns raised", "cautioned against"]),
                    "confidence": None,
                    "evidence_quote": "Engineering dissent formally raised."
                },
                "missing_evidence_acknowledged": {
                    "value": any(w in p_lower for w in ["missing telemetry", "inconclusive", "untested", "unproven", "lack of data", "uncertainty"]),
                    "confidence": None,
                    "evidence_quote": "Incomplete empirical data acknowledged."
                },
                "prior_normalization_of_risk": {
                    "value": any(w in p_lower for w in ["prior flights", "previously accepted", "normalized", "recurring", "accepted risk"]),
                    "confidence": None,
                    "evidence_quote": "Prior flights exhibited similar anomalies without consequence."
                },
                "independent_review_skipped": {
                    "value": any(w in p_lower for w in ["bypassed", "independent review skipped", "not escalated", "expedited", "waived review"]),
                    "confidence": None,
                    "evidence_quote": "Independent verification was not conducted."
                }
            }
        })
    
    # Grounded explanation prompt
    return (
        "Based on the deterministic factor analysis, the current mission review shares critical "
        "causal risk patterns with the identified historical precedent. Key shared factors indicate "
        "vulnerabilities in operating margins, communication of dissent, and reliance on past survivability "
        "to justify flight readiness. Note that differing operational and environmental factors delineate "
        "the scope of this historical analogy."
    )

class DevelopmentFallbackProvider(AIExtractionProvider):
    @property
    def name(self) -> str:
        return "DEVELOPMENT FALLBACK"

    def generate_text(self, prompt: str, system_prompt: str | None = None) -> str:
        return simulate_development_fallback_response(prompt, system_prompt)


def get_provider() -> AIExtractionProvider:
    provider_name = settings.ai_provider.strip().lower()
    
    if not provider_name:
        return DevelopmentFallbackProvider()
        
    if provider_name == "granite":
        return GraniteProvider()
    elif provider_name == "gemini":
        return GeminiProvider()
    elif provider_name == "groq":
        return GroqProvider()
    else:
        logger.warning(f"Unknown AI provider '{provider_name}', falling back to development fallback.")
        return DevelopmentFallbackProvider()
