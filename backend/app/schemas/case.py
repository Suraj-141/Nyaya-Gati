from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, Dict, List
from enum import Enum
import re

class CaseTypeEnum(str, Enum):
    CRIMINAL = "criminal"
    CIVIL = "civil"
    FAMILY = "family"
    COMMERCIAL = "commercial"

class CaseStatusEnum(str, Enum):
    FILED = "filed"
    EVIDENCE = "evidence"
    ARGUMENTS = "arguments"
    JUDGMENT = "judgment"
    DISPOSED = "disposed"

class CaseCreate(BaseModel):
    case_number: str = Field(..., min_length=5, max_length=50)
    filing_date: datetime
    case_type: CaseTypeEnum
    petitioner: Dict  # {"name": str, "lawyer": str, "legal_aid": bool}
    respondent: Dict
    petition_text: str = Field(..., min_length=100)
    petition_pdf_url: Optional[str] = None
    court_id: int
    
    @validator('case_number')
    def validate_case_number(cls, v):
        # Format: COURT_CODE/YEAR/CASE_NUM (e.g., "BNG/2024/12345")
        if not re.match(r'^[A-Z]{3}/\d{4}/\d+$', v):
            raise ValueError('Invalid case number format')
        return v

class CaseInDB(BaseModel):
    id: int
    case_number: str
    filing_date: datetime
    case_type: CaseTypeEnum
    status: CaseStatusEnum
    
    # AI Scores
    merit_score: Optional[float] = None
    merit_explanation: Optional[str] = None
    urgency_score: Optional[float] = None
    urgency_explanation: Optional[str] = None
    
    # Timeline
    predicted_hearings: Optional[int] = None
    predicted_duration_months: Optional[float] = None
    
    # Metadata
    court_id: int
    judge_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True  # Pydantic v2

class CaseResponse(CaseInDB):
    """Extended response with computed fields"""
    case_age_days: int = 0
    next_hearing_date: Optional[datetime] = None
    completion_percentage: int = 0
    
    @validator('completion_percentage', always=True, pre=True)
    def calculate_completion(cls, v, values):
        status_map = {
            CaseStatusEnum.FILED: 20,
            CaseStatusEnum.EVIDENCE: 40,
            CaseStatusEnum.ARGUMENTS: 70,
            CaseStatusEnum.JUDGMENT: 90,
            CaseStatusEnum.DISPOSED: 100
        }
        # In Pydantic v1, values is a dict. In v2 validator with mode='before', it's also a dict usually
        status = values.get('status')
        return status_map.get(status, 0)
        
    @validator('case_age_days', always=True, pre=True)
    def calculate_age(cls, v, values):
        filing_date = values.get('filing_date')
        if filing_date:
            delta = datetime.utcnow() - filing_date.replace(tzinfo=None)
            return delta.days
        return 0

class CaseUpdate(BaseModel):
    status: Optional[CaseStatusEnum] = None
    judge_id: Optional[int] = None
    merit_score: Optional[float] = Field(None, ge=0, le=100)
    urgency_score: Optional[float] = Field(None, ge=0, le=200)

class PriorityQueueResponse(BaseModel):
    """Response for judge priority queue"""
    cases: List[CaseResponse]
    total_count: int
    high_urgency_count: int  # urgency_score > 150
    low_merit_count: int  # merit_score < 50
