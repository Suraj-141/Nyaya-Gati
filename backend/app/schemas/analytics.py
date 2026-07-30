from pydantic import BaseModel
from typing import List

class ClearanceRateStats(BaseModel):
    period: str
    cases_filed: int
    cases_disposed: int
    clearance_rate_percentage: float

class DurationStats(BaseModel):
    case_type: str
    average_duration_days: float

class AnalyticsResponse(BaseModel):
    """Admin Analytics Response Schema"""
    total_active_cases: int
    clearance_rates: List[ClearanceRateStats]
    average_durations: List[DurationStats]
    frivolous_cases_flagged: int
    court_utilization_percentage: float
