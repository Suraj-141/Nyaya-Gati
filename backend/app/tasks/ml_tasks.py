from app.core.celery_app import celery_app
from app.services.ml_service import MLService
from app.db.base import SessionLocal
from app.models.case import Case
import logging

logger = logging.getLogger(__name__)

@celery_app.task(name="app.tasks.ml_tasks.process_case_async")
def process_case_async(case_id: int):
    """
    Asynchronously process a case: Extract entities, predict merit, urgency, and timeline.
    Updates the database and Elasticsearch index.
    """
    db = SessionLocal()
    try:
        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            logger.error(f"Case {case_id} not found for async processing")
            return

        ml_service = MLService()
        ml_service.load_models()

        # Perform heavy NER and ML inference
        entities = ml_service.extract_entities(case.petition_text)
        merit_result = ml_service.predict_merit({"text": case.petition_text})
        
        # Update case
        case.entities = entities
        case.merit_score = merit_result['merit_score']
        case.merit_explanation = merit_result['explanation']
        
        db.commit()
        logger.info(f"Asynchronously processed case {case_id}")
        
    except Exception as e:
        logger.error(f"Async processing failed for case {case_id}: {e}")
    finally:
        db.close()
