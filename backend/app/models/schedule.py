from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.db.base_class import Base

class ScheduleStatus(enum.Enum):
    """Status of the scheduled hearing."""
    SCHEDULED = "scheduled"
    HELD = "held"
    ADJOURNED = "adjourned"
    CANCELLED = "cancelled"

class Schedule(Base):
    """Schedule model for court hearings."""
    __tablename__ = "schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False, index=True)
    judge_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    courtroom = Column(String(100), nullable=False)
    
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False)
    status = Column(Enum(ScheduleStatus), default=ScheduleStatus.SCHEDULED, index=True)
    remarks = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    case = relationship("Case", back_populates="schedules")
    judge = relationship("User", back_populates="schedules")
    
    def __repr__(self) -> str:
        return f"<Schedule {self.start_time} - {self.status.value}>"
