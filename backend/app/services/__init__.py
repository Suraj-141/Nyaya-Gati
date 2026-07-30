# Business logic services

from sqlalchemy.orm import Session
from app.models import Case
from app.schemas import CaseCreate
from app.ml import predict_frivolous

def create_case(db: Session, case_in: CaseCreate) -> Case:
    """
    Create a case and automatically run ML models on it
    """
    db_case = Case(**case_in.dict())
    
    # Run ML inference
    # TODO: Make this async or run in background worker (Celery/Redis)
    db_case.merit_score = predict_frivolous(db_case.description)
    
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case
