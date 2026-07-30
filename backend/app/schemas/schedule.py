from pydantic import BaseModel, Field, validator
from datetime import datetime, date
from typing import Optional, List
from enum import Enum

class ScheduleStatusEnum(str, Enum):
    SCHEDULED = "scheduled"
    HELD = "held"
    ADJOURNED = "adjourned"
    CANCELLED = "cancelled"

class ScheduleBase(BaseModel):
    case_id: int
    judge_id: int
    courtroom: str = Field(..., min_length=1, max_length=100)
    start_time: datetime
    end_time: datetime
    remarks: Optional[str] = None

class ScheduleCreate(ScheduleBase):
    @validator('end_time')
    def check_end_time(cls, v, values):
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('end_time must be after start_time')
        return v

class ScheduleInDB(ScheduleBase):
    id: int
    status: Optional[ScheduleStatusEnum] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ScheduleResponse(ScheduleInDB):
    pass

class DailyScheduleResponse(BaseModel):
    date: date
    schedules: List[ScheduleResponse]
    total_hearings: int
    total_duration_minutes: int
    utilization_percentage: float
