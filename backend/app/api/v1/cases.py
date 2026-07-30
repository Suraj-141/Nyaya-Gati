from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.db.base import get_db
from app.models.case import Case, CaseStatus, CaseType
from app.schemas.case import CaseCreate, CaseResponse, CaseUpdate, PriorityQueueResponse
from app.models.user import User
from app.api.v1 import deps
from app.services.ml_service import MLService
from app.services.search_service import SearchService
import logging
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)

# --- Mock Service ---
# This mock handles DB operations until a real CaseService is built
class MockCaseService:
    def __init__(self, db):
        self.db = db
    async def process_petition_pdf(self, pdf):
        return "https://storage.nyayagati.in/mock.pdf", "Mock petition text extracted from PDF."
    async def get_petitioner_history(self, name):
        return {'past_cases_count': 2, 'dismissal_rate': 0.1}
    def create_case(self, **kwargs):
        case_data = kwargs.pop('case_data')
        db_case = Case(
            case_number=case_data.case_number,
            filing_date=case_data.filing_date,
            case_type=case_data.case_type,
            petitioner=case_data.petitioner,
            respondent=case_data.respondent,
            petition_text=kwargs.get('petition_text'),
            petition_pdf_url=kwargs.get('petition_pdf_url'),
            court_id=case_data.court_id,
            entities=kwargs.get('entities'),
            merit_score=kwargs.get('merit_score'),
            merit_explanation=kwargs.get('merit_explanation'),
            urgency_score=kwargs.get('urgency_score'),
            urgency_explanation=kwargs.get('urgency_explanation'),
            predicted_hearings=kwargs.get('predicted_hearings'),
            predicted_duration_months=kwargs.get('predicted_duration')
        )
        self.db.add(db_case)
        self.db.commit()
        self.db.refresh(db_case)
        return db_case
    def update_case(self, case_id, case_update, updated_by):
        case = self.db.query(Case).filter(Case.id == case_id).first()
        if not case: return None
        update_data = case_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(case, key, value)
        self.db.commit()
        self.db.refresh(case)
        return case
    def override_urgency(self, case_id, new_score, reason, judge_id):
        case = self.db.query(Case).filter(Case.id == case_id).first()
        if not case: return None
        case.urgency_score = new_score
        self.db.commit()
        self.db.refresh(case)
        return case

class TimelineService:
    def generate_milestones(self, case):
        return [
            {"milestone": "First Hearing", "estimated_date": "2024-06-01"},
            {"milestone": "Evidence Completion", "estimated_date": "2024-10-01"}
        ]
# -------------------------

@router.post("/", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    case_data: CaseCreate = Depends(),
    petition_pdf: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Create a new case with petition upload and AI processing
    """
    try:
        case_service = MockCaseService(db)
        ml_service = MLService()
        
        # Step 1-2: Upload PDF and OCR
        pdf_url, petition_text = await case_service.process_petition_pdf(petition_pdf)
        
        # Step 3: NER extraction
        entities = ml_service.extract_entities(petition_text)
        
        # Step 4: Frivolous detection
        petition_features = {
            'text': petition_text,
            'evidence_attachments': getattr(case_data, 'evidence_count', 0)
        }
        merit_result = ml_service.predict_merit(petition_features)
        
        # Step 5: Urgency scoring
        urgency_result = ml_service.calculate_urgency(
            case_type=case_data.case_type,
            filing_date=case_data.filing_date,
            petitioner=case_data.petitioner,
            entities=entities
        )
        
        # Step 6: Timeline prediction
        timeline_result = ml_service.predict_timeline(vars(case_data))
        
        # Step 7: Create case in database
        case = case_service.create_case(
            case_data=case_data,
            petition_text=petition_text,
            petition_pdf_url=pdf_url,
            entities=entities,
            merit_score=merit_result['merit_score'],
            merit_explanation=merit_result['explanation'],
            urgency_score=urgency_result['urgency_score'],
            urgency_explanation=urgency_result['explanation'],
            predicted_hearings=timeline_result['predicted_hearings'],
            predicted_duration=timeline_result['predicted_duration_months']
        )
        
        logger.info(f"Case created: {case.case_number}")
        
        # Step 8: Index in Elasticsearch
        try:
            search_service = SearchService()
            search_service.index_case(case.id, {
                "case_number": case.case_number,
                "case_type": case.case_type.value,
                "petitioner": case.petitioner.get('name'),
                "respondent": case.respondent.get('name'),
                "petition_text": petition_text,
                "entities": entities,
                "filing_date": case.filing_date.isoformat(),
                "status": case.status.value
            })
        except Exception as e:
            logger.error(f"Post-creation indexing failed for case {case.id}: {e}")

        return case
    
    except Exception as e:
        logger.error(f"Error creating case: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search", response_model=List[CaseResponse])
async def search_cases(
    q: str = Query(..., min_length=3, description="Search query string"),
    db: Session = Depends(get_db)
):
    """
    Full-text search using Elasticsearch
    """
    search_service = SearchService()
    results = search_service.search_cases(q)
    
    if not results:
        # Fallback to simple DB ILIKE search if ES returns nothing or is down
        logger.info(f"ES search returned no results for '{q}', falling back to DB.")
        cases = db.query(Case).filter(Case.petition_text.ilike(f"%{q}%")).limit(20).all()
        return cases
        
    return results

@router.get("/priority-queue", response_model=PriorityQueueResponse)
async def get_priority_queue(
    limit: int = 50,
    min_urgency: Optional[float] = None,
    case_type: Optional[CaseType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_judge)
):
    """Get cases sorted by urgency score (judge priority queue)"""
    query = db.query(Case).filter(Case.status != CaseStatus.DISPOSED)
    
    if min_urgency:
        query = query.filter(Case.urgency_score >= min_urgency)
    if case_type:
        query = query.filter(Case.case_type == case_type)
        
    query = query.order_by(Case.urgency_score.desc(), Case.filing_date.asc())
    cases = query.limit(limit).all()
    
    total_count = query.count()
    high_urgency_count = db.query(Case).filter(Case.urgency_score > 150, Case.status != CaseStatus.DISPOSED).count()
    low_merit_count = db.query(Case).filter(Case.merit_score < 50, Case.status != CaseStatus.DISPOSED).count()
    
    return PriorityQueueResponse(
        cases=cases,
        total_count=total_count,
        high_urgency_count=high_urgency_count,
        low_merit_count=low_merit_count
    )

@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Get case by ID with all details"""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: int,
    case_update: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_judge)
):
    """Update case details (status, scores, judge assignment)"""
    case_service = MockCaseService(db)
    case = case_service.update_case(case_id, case_update, updated_by=current_user.id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    logger.info(f"Case updated: {case.case_number} by user {current_user.id}")
    return case

@router.post("/bulk-update")
async def bulk_update_cases(
    case_ids: List[int] = Body(...),
    update_data: CaseUpdate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_judge)
):
    """Batch update multiple cases (e.g., mass re-assignment or status change) balance"""
    updated_count = 0
    for cid in case_ids:
        case = db.query(Case).filter(Case.id == cid).first()
        if case:
            for key, value in update_data.dict(exclude_unset=True).items():
                setattr(case, key, value)
            updated_count += 1
    db.commit()
    logger.info(f"Bulk updated {updated_count} cases by user {current_user.id}")
    return {"message": f"Successfully updated {updated_count} cases", "updated_count": updated_count}

@router.post("/{case_id}/override-priority")
async def override_priority(
    case_id: int,
    new_urgency_score: float = Body(...),
    reason: str = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_judge)
):
    """Allow judge to manually override AI-assigned urgency score"""
    case_service = MockCaseService(db)
    case = case_service.override_urgency(
        case_id=case_id,
        new_score=new_urgency_score,
        reason=reason,
        judge_id=current_user.id
    )
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    logger.info(f"Priority overridden for case {case.case_number}: {reason}")
    return {"message": "Priority updated", "new_urgency_score": new_urgency_score}

@router.get("/{case_id}/timeline")
async def get_case_timeline(case_id: int, db: Session = Depends(get_db)):
    """Get predicted timeline with milestones for a case"""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    timeline_service = TimelineService()
    milestones = timeline_service.generate_milestones(case)
    
    return {
        "case_number": case.case_number,
        "predicted_hearings": case.predicted_hearings,
        "predicted_duration_months": case.predicted_duration_months,
        "milestones": milestones,
        "completion_percentage": calculate_completion_percentage(case)
    }

@router.post("/{case_id}/documents")
async def upload_case_document(
    case_id: int,
    document: UploadFile = File(...),
    doc_type: str = Query(..., description="E.g., evidence, affidavit, judgment"),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Upload a supplemental document to a case"""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    # TODO: Upload to S3/MinIO and link to Case
    logger.info(f"Document {document.filename} uploaded for case {case_id}")
    return {"message": "Document uploaded successfully", "filename": document.filename}

@router.get("/{case_id}/notes")
async def get_case_notes(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_judge)
):
    """Retrieve judge notes for a case"""
    # TODO: Query a separate CaseNotes table
    return {"case_id": case_id, "notes": [{"id": 1, "text": "Initial review completed.", "date": datetime.utcnow()}]}

@router.post("/{case_id}/notes")
async def add_case_note(
    case_id: int,
    note_text: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_judge)
):
    """Add a private note to a case (Judge only)"""
    # TODO: Save to CaseNotes table
    logger.info(f"Note added to case {case_id} by user {current_user.id}")
    return {"message": "Note added successfully"}

@router.get("/{case_id}/similar")
async def get_similar_cases(
    case_id: int,
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Find similar past judgments for a case using cosine similarity on TF-IDF embeddings"""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    text = case.petition_text or ""
    # If no petition text is stored, fallback to the description or case details
    if not text:
        text = f"{case.petitioner.get('name', '')} vs {case.respondent.get('name', '')} {case.case_type.value}"
        
    from app.ml import model_loader
    similar_cases = model_loader.find_similar_cases(text, top_k=limit)
    return similar_cases

def calculate_completion_percentage(case: Case) -> int:
    """Calculate case completion % based on status"""
    status_map = {
        CaseStatus.FILED: 20,
        CaseStatus.EVIDENCE: 40,
        CaseStatus.ARGUMENTS: 70,
        CaseStatus.JUDGMENT: 90,
        CaseStatus.DISPOSED: 100
    }
    return status_map.get(case.status, 0)

