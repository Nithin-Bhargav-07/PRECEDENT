"""Shared domain enumerations."""

from enum import Enum


class FactorCategoryID(str, Enum):
    CAT_TECH = "CAT_TECH"
    CAT_ENV = "CAT_ENV"
    CAT_HUMAN = "CAT_HUMAN"
    CAT_PROCESS = "CAT_PROCESS"


class SchedulePressureLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class CaseOutcomeType(str, Enum):
    """Ontology for historical mission outcomes."""

    CATASTROPHIC_FAILURE = "CATASTROPHIC_FAILURE"
    MISSION_LOSS = "MISSION_LOSS"
    ADVERSE_EVENT_RECOVERED = "ADVERSE_EVENT_RECOVERED"
    NEAR_MISS_RECOVERED = "NEAR_MISS_RECOVERED"


class CaseVerificationStatus(str, Enum):
    """Verification status of a historical case."""

    VERIFIED = "VERIFIED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    USER_SUBMITTED = "USER_SUBMITTED"


class ConfidenceLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    NONE = "NONE"


class ReviewStatus(str, Enum):
    PRECEDENT_FOUND = "PRECEDENT_FOUND"
    NO_STRONG_PRECEDENT = "NO_STRONG_PRECEDENT"


class AuditActionType(str, Enum):
    ACKNOWLEDGED = "ACKNOWLEDGED"
    DISMISSED = "DISMISSED"
