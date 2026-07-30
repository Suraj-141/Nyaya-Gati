from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.db.base_class import Base

class UserRole(enum.Enum):
    """Enum for user roles."""
    JUDGE = "judge"
    LITIGANT = "litigant"
    ADMIN = "admin"

class User(Base):
    """User model for Judges, Litigants, and Admins."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), index=True)
    role = Column(Enum(UserRole), nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    
    # Role-specific fields
    bar_registration_number = Column(String(100), unique=True, nullable=True) # For judges/lawyers
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    assigned_cases = relationship("Case", back_populates="judge")
    schedules = relationship("Schedule", back_populates="judge")
    audit_logs = relationship("AuditLog", back_populates="user")
    
    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role.value})>"
