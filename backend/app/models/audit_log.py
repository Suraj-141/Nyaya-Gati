from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class AuditLog(Base):
    """AuditLog model for tracking AI recommendations and judge overrides."""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True, index=True)
    
    action = Column(String(200), nullable=False, index=True) # e.g., "AI_RECOMMENDATION", "JUDGE_OVERRIDE"
    details = Column(JSON, nullable=False) # Store the recommendation/override info
    reasoning = Column(Text, nullable=True) # Judge's reasoning for override
    
    created_at = Column(DateTime, server_default=func.now(), index=True)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    def __repr__(self) -> str:
        return f"<AuditLog {self.action} by User {self.user_id}>"
