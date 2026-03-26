"""Data schemas for judgecalibrator."""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class TrustGrade(str, Enum):
    """Trust grade enum for audit reports."""

    A = "A"
    B_PLUS = "B+"
    B = "B"
    C = "C"
    UNKNOWN = "UNKNOWN"


class Task(BaseModel):
    """A single evaluation task."""

    id: str
    question: str
    reference_answer: Optional[str] = None
    options: Optional[List[str]] = None
    human_score: Optional[float] = None
    category: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class JudgeResponse(BaseModel):
    """Response from a judge model."""

    task_id: str
    score: float = Field(ge=1, le=10)
    confidence: float = Field(ge=0, le=100)
    reasoning: Optional[str] = None
    raw_response: Optional[str] = None


class CalibrationBin(BaseModel):
    """A single bin in the calibration analysis."""

    confidence_min: float
    confidence_max: float
    mean_confidence: float
    accuracy: float
    count: int


class ProbeResult(BaseModel):
    """Result from a single probe."""

    probe_name: str
    metric_name: str
    metric_value: float
    details: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None


class AuditReport(BaseModel):
    """Complete audit report for a judge."""

    judge: str
    benchmark: str
    tasks_evaluated: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    probes: List[ProbeResult] = Field(default_factory=list)
    trust_grade: TrustGrade = TrustGrade.UNKNOWN
    recommendations: List[str] = Field(default_factory=list)
    total_tokens: int = 0
    estimated_cost_usd: float = 0.0
