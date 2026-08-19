"""Environment settings (watsonx API keys, project ID, data paths)."""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "PRECEDENT"
    app_env: str = "development"
    debug: bool = True
    log_level: str = "INFO"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # AI Provider Selection
    ai_provider: str = ""

    # IBM watsonx.ai
    watsonx_api_key: str = ""
    watsonx_project_id: str = ""
    watsonx_url: str = "https://us-south.ml.cloud.ibm.com"
    watsonx_model_id: str = "ibm/granite-3-8b-instruct"

    # Google Gemini
    gemini_api_key: str = ""
    gemini_model_id: str = "gemini-1.5-pro"

    # Groq
    groq_api_key: str = ""
    groq_model_id: str = "llama3-70b-8192"

    # Data paths
    cases_data_path: str = "data/cases.json"
    sessions_data_path: str = "data/sessions.json"
    factor_schema_path: str = "data/schema.json"

    # Reasoning engine thresholds
    abstention_threshold: float = 2.0
    abstention_threshold_single_factor: float = 1.0

    # Optional vector search
    vector_search_enabled: bool = False

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
