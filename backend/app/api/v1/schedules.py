from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
from app.db.base import get_db
from app.models.schedule import Schedule
from app.models.case import Case
from app.schemas.schedule import ScheduleCreate, ScheduleResponse, DailyScheduleResponse
from app.models.user import User
import logging

from app.db.base import get_db
from app.models.schedule import Schedule
from app.models.case import Case
from app.schemas.schedule import ScheduleCreate, ScheduleResponse, DailyScheduleResponse
from app.models.user import User
from app.api.v1 import deps
from app.services.scheduler_service import SchedulerService
import logging

router = APIRouter(prefix="/schedule", tags=["schedule"])
logger = logging.getLogger(__name__)

@router.post("/optimize", response_model=List[ScheduleResponse])
async def optimize_schedule(
    target_date: date,
    judge_ids: List[int] = Body(...),
    max_cases_per_judge: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_judge)
):
    """
    Generate optimized court schedule for a given date using CP-SAT solver.
    """
    try:
        scheduler_service = SchedulerService()
        
        # 1. Get candidate cases (unscheduled or needing rescheduling)
        # Sort by urgency to prioritize high-risk cases
        candidate_cases = db.query(Case).filter(
            Case.status != "disposed"
        ).order_by(Case.urgency_score.desc()).limit(len(judge_ids) * max_cases_per_judge * 3).all()
        
        if not candidate_cases:
            return []

        # 2. Define available courtrooms (could be dynamic)
        courtrooms = ["Courtroom A", "Courtroom B", "Courtroom C", "Chamber 1"]
        
        # 3. Run optimization
        optimized_results = scheduler_service.optimize_daily_schedule(
            cases=candidate_cases,
            judges=judge_ids,
            courtrooms=courtrooms,
            target_date=target_date
        )
        
        # 4. Save to database
        schedules = []
        for entry in optimized_results:
            # Check if case already has a schedule for this day to avoid duplicates
            existing = db.query(Schedule).filter(
                Schedule.case_id == entry['case_id'],
                Schedule.start_time >= datetime.combine(target_date, datetime.min.time()),
                Schedule.start_time <= datetime.combine(target_date, datetime.max.time())
            ).first()
            
            if existing:
                continue

            schedule = Schedule(
                case_id=entry['case_id'],
                judge_id=entry['judge_id'],
                courtroom=entry['courtroom'],
                start_time=entry['start_time'],
                end_time=entry['end_time'],
                status="scheduled"
            )
            db.add(schedule)
            schedules.append(schedule)
        
        db.commit()
        logger.info(f"Optimized schedule created for {target_date}: {len(schedules)} hearings by Judge {current_user.id}")
        
        return schedules
    
    except Exception as e:
        logger.error(f"Schedule optimization failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Optimization engine error: {str(e)}")

@router.get("/daily/{target_date}", response_model=DailyScheduleResponse)
async def get_daily_schedule(
    target_date: date,
    judge_id: Optional[int] = None,
    courtroom: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get court schedule for a specific date. Can filter by judge or courtroom.
    """
    start_of_day = datetime.combine(target_date, datetime.min.time())
    end_of_day = datetime.combine(target_date, datetime.max.time())
    
    query = db.query(Schedule).filter(Schedule.start_time >= start_of_day, Schedule.start_time <= end_of_day)
    
    if judge_id:
        query = query.filter(Schedule.judge_id == judge_id)
    
    if courtroom:
        query = query.filter(Schedule.courtroom == courtroom)
    
    schedules = query.order_by(Schedule.start_time).all()
    
    # Calculate summary stats
    total_hearings = len(schedules)
    total_duration_minutes = sum(int((s.end_time - s.start_time).total_seconds() / 60) for s in schedules if s.start_time and s.end_time)
    court_hours = 6 * 60  # 6 hours per day
    utilization = (total_duration_minutes / court_hours) * 100 if court_hours > 0 else 0
    
    return DailyScheduleResponse(
        date=target_date,
        schedules=schedules,
        total_hearings=total_hearings,
        total_duration_minutes=total_duration_minutes,
        utilization_percentage=round(utilization, 1)
    )

@router.patch("/{schedule_id}")
async def update_schedule(
    schedule_id: int,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    courtroom: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_judge)
):
    """
    Update schedule entry (reschedule, change courtroom, mark complete)
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    if start_time:
        schedule.start_time = start_time
    if end_time:
        schedule.end_time = end_time
    if courtroom:
        schedule.courtroom = courtroom
    if status:
        setattr(schedule, 'status', status)
    
    db.commit()
    db.refresh(schedule)
    
    logger.info(f"Schedule updated: {schedule_id}")
    
    return schedule

@router.delete("/{schedule_id}")
async def cancel_hearing(
    schedule_id: int,
    reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_judge)
):
    """Cancel a scheduled hearing"""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    setattr(schedule, 'status', "cancelled")
    setattr(schedule, 'cancellation_reason', reason)
    
    db.commit()
    
    logger.info(f"Hearing cancelled: {schedule_id}, Reason: {reason}")
    
    return {"message": "Hearing cancelled", "schedule_id": schedule_id}

@router.get("/conflicts/detect")
async def detect_conflicts(
    target_date: date,
    judge_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_judge)
):
    """Detect scheduling conflicts (overlapping times for judges/courtrooms)"""
    start_of_day = datetime.combine(target_date, datetime.min.time())
    end_of_day = datetime.combine(target_date, datetime.max.time())
    
    query = db.query(Schedule).filter(Schedule.start_time >= start_of_day, Schedule.start_time <= end_of_day)
    if judge_id:
        query = query.filter(Schedule.judge_id == judge_id)
        
    schedules = query.order_by(Schedule.start_time).all()
    conflicts = []
    
    for i in range(len(schedules)):
        for j in range(i + 1, len(schedules)):
            s1, s2 = schedules[i], schedules[j]
            # Overlap condition
            if s1.start_time < s2.end_time and s2.start_time < s1.end_time:
                if s1.judge_id == s2.judge_id:
                    conflicts.append({"type": "judge_overlap", "judge_id": s1.judge_id, "schedules": [s1.id, s2.id]})
                if s1.courtroom == s2.courtroom:
                    conflicts.append({"type": "courtroom_overlap", "courtroom": s1.courtroom, "schedules": [s1.id, s2.id]})
                    
    return {"date": target_date, "conflicts": conflicts}

@router.get("/suggestions")
async def get_suggestions(
    case_id: int,
    estimated_duration_minutes: int,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Suggest alternative available times for a case avoiding conflicts"""
    # Mocking suggestion logic
    suggestions = [
        {"suggested_start": datetime.combine(start_date, datetime.min.time()) + timedelta(hours=10), "courtroom": "Room 1"},
        {"suggested_start": datetime.combine(start_date, datetime.min.time()) + timedelta(hours=14), "courtroom": "Room 3"}
    ]
    return {"case_id": case_id, "suggestions": suggestions}

@router.post("/bulk-reschedule")
async def bulk_reschedule(
    schedule_ids: List[int] = Body(...),
    new_date: date = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_judge)
):
    """Reschedule multiple hearings to a new date"""
    rescheduled = 0
    for sid in schedule_ids:
        schedule = db.query(Schedule).filter(Schedule.id == sid).first()
        if schedule and schedule.start_time and schedule.end_time:
            # Shift the dates but keep the time
            duration = schedule.end_time - schedule.start_time
            time_of_day = schedule.start_time.time()
            schedule.start_time = datetime.combine(new_date, time_of_day)
            schedule.end_time = schedule.start_time + duration
            rescheduled += 1
    db.commit()
    logger.info(f"Bulk rescheduled {rescheduled} hearings to {new_date}")
    return {"message": f"Successfully rescheduled {rescheduled} hearings", "new_date": new_date}
