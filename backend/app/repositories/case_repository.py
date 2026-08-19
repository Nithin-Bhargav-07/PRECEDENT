"""Load and query structured historical case base."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Final

from app.core.config import settings
from app.core.logging import get_logger
from app.models.case import HistoricalCase
from app.models.enums import CaseOutcomeType

logger = get_logger(__name__)


class CaseRepository:
    """In-memory cached repository for historical aerospace incident cases."""

    def __init__(self, data_path: str | Path | None = None) -> None:
        self._data_path = Path(data_path or settings.cases_data_path)
        self._cases_cache: dict[str, HistoricalCase] = {}
        self._loaded: bool = False

    def load(self, force_reload: bool = False) -> None:
        """Load and validate all historical cases from the JSON dataset."""
        if self._loaded and not force_reload:
            return

        if not self._data_path.exists():
            # If relative path fails, try relative to project root
            alt_path = Path(__file__).resolve().parents[2] / self._data_path
            if alt_path.exists():
                self._data_path = alt_path
            else:
                raise FileNotFoundError(f"Cases dataset not found at: {self._data_path}")

        logger.info("Loading historical case base from: %s", self._data_path)
        with open(self._data_path, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        if not isinstance(raw_data, list):
            raise ValueError(f"Cases dataset must be a JSON array, got {type(raw_data)}")

        loaded_cases: dict[str, HistoricalCase] = {}
        for item in raw_data:
            case = HistoricalCase.model_validate(item)
            if case.id in loaded_cases:
                raise ValueError(f"Duplicate case ID in dataset: {case.id}")
            loaded_cases[case.id] = case

        self._cases_cache = loaded_cases
        self._loaded = True
        logger.info("Successfully loaded and validated %d historical cases", len(self._cases_cache))

    def get_all_cases(self) -> list[HistoricalCase]:
        """Return all historical cases."""
        self.load()
        return list(self._cases_cache.values())

    def get_case_by_id(self, case_id: str) -> HistoricalCase | None:
        """Retrieve a single historical case by unique ID."""
        self.load()
        return self._cases_cache.get(case_id)

    def get_failure_cases(self) -> list[HistoricalCase]:
        """Return all catastrophic failure and mission loss cases."""
        self.load()
        return [
            case
            for case in self._cases_cache.values()
            if case.outcome_type in {CaseOutcomeType.CATASTROPHIC_FAILURE, CaseOutcomeType.MISSION_LOSS}
        ]

    def get_counter_evidence_cases(self) -> list[HistoricalCase]:
        """Return all near-miss recovered cases suitable for counter-evidence analysis."""
        self.load()
        return [
            case
            for case in self._cases_cache.values()
            if case.outcome_type == CaseOutcomeType.NEAR_MISS_RECOVERED
        ]

    def count(self) -> int:
        """Return total number of cases."""
        self.load()
        return len(self._cases_cache)

    def save_case(self, case: HistoricalCase) -> None:
        """Save a user-submitted case to the JSON dataset."""
        self.load()
        
        # Protect existing verified cases from being overwritten
        if case.id in self._cases_cache:
            existing = self._cases_cache[case.id]
            from app.models.enums import CaseVerificationStatus
            if existing.verification_status == CaseVerificationStatus.VERIFIED:
                raise ValueError(f"Cannot overwrite verified historical case: {case.id}")
                
        # Exact duplicate title check
        for existing_case in self._cases_cache.values():
            if existing_case.id != case.id and existing_case.case_name.lower() == case.case_name.lower():
                raise ValueError(f"A historical case with the title '{case.case_name}' already exists.")
                
        self._cases_cache[case.id] = case
        
        # Write back to cases.json
        raw_data = [c.model_dump(mode="json") for c in self._cases_cache.values()]
        with open(self._data_path, "w", encoding="utf-8") as f:
            json.dump(raw_data, f, indent=2)
            
        logger.info(f"Saved case {case.id} with status {case.verification_status}")

case_repository: Final[CaseRepository] = CaseRepository()
