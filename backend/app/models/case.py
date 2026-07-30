from sqlalchemy import Column, Integer, String, DateTime, Float, JSON, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base
import enum

class CaseType(enum.Enum):
    """Enum representing the type of legal case."""
    CRIMINAL = "criminal"
    CIVIL = "civil"
    FAMILY = "family"
    COMMERCIAL = "commercial"

class CaseStatus(enum.Enum):
    """Enum representing the current status of the case."""
    FILED = "filed"
    EVIDENCE = "evidence"
    ARGUMENTS = "arguments"
    JUDGMENT = "judgment"
    DISPOSED = "disposed"

class Case(Base):
    """Case model representing a legal case in the system."""
    __tablename__ = "cases"
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(50), unique=True, nullable=False, index=True)
    filing_date = Column(DateTime, nullable=False, index=True)
    case_type = Column(Enum(CaseType), nullable=False)
    status = Column(Enum(CaseStatus), default=CaseStatus.FILED, index=True)
    
    # Parties (JSON for flexibility)
    petitioner = Column(JSON)  # {"name": "...", "lawyer": "...", "legal_aid": bool}
    respondent = Column(JSON)
    
    # Document storage
    petition_text = Column(Text)
    petition_pdf_url = Column(String(500))
    
    # NER extracted entities (JSON)
    entities = Column(JSON)  # {"persons": [...], "statutes": [...], "dates": [...]}
    
    # AI Scores
    merit_score = Column(Float, index=True)  # 0-100
    merit_explanation = Column(Text)
    urgency_score = Column(Float, index=True)  # 0-200
    urgency_explanation = Column(Text)
    
    # Timeline predictions
    predicted_hearings = Column(Integer)
    predicted_duration_months = Column(Float)
    prediction_confidence = Column(Float)
    
    # Current Schedule Cache
    next_hearing_date = Column(DateTime, index=True)
    courtroom = Column(String(100))
    
    # Metadata
    court_id = Column(Integer, ForeignKey("courts.id"))
    judge_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    court = relationship("Court", back_populates="cases")
    judge = relationship("User", back_populates="assigned_cases")
    schedules = relationship("Schedule", back_populates="case")
    
    def __repr__(self) -> str:
        return f"<Case {self.case_number}>"
