import sys
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Add the app directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.base import SessionLocal
from app.models.case import Case, CaseType, CaseStatus
from app.models.user import User, UserRole

def load_sample_data():
    db: Session = SessionLocal()
    
    # Get the judge user created in create_admin.py
    judge = db.query(User).filter(User.role == UserRole.JUDGE).first()
    if not judge:
        print("Please run create_admin.py first to create a judge.")
        return

    # Sample Cases
    cases_data = [
        {
            "case_number": "BNG/2024/001",
            "title": "State vs. CyberCorp (Data Privacy Breach)",
            "case_type": CaseType.CRIMINAL,
            "status": CaseStatus.EVIDENCE,
            "urgency_score": 185.5,
            "merit_score": 92.0,
            "petitioner": {"name": "State of Karnataka", "lawyer": "Adv. Ramesh"},
            "respondent": {"name": "CyberCorp Ltd", "lawyer": "Adv. Sneha"},
            "filing_date": datetime.now() - timedelta(days=60),
            "next_hearing_date": datetime.now() + timedelta(days=5),
            "courtroom": "Room 101"
        },
        {
            "case_number": "BNG/2024/002",
            "title": "Patel vs. Land Authority (Illegal Encroachment)",
            "case_type": CaseType.CIVIL,
            "status": CaseStatus.ARGUMENTS,
            "urgency_score": 142.0,
            "merit_score": 78.5,
            "petitioner": {"name": "Suresh Patel", "lawyer": "Adv. Vivek"},
            "respondent": {"name": "Municipal Corp", "lawyer": "Adv. Anjali"},
            "filing_date": datetime.now() - timedelta(days=120),
            "next_hearing_date": datetime.now() + timedelta(days=12),
            "courtroom": "Room 204"
        },
        {
            "case_number": "BNG/2024/003",
            "title": "Tech Solutions vs. Soft Systems (IP Infringement)",
            "case_type": CaseType.COMMERCIAL,
            "status": CaseStatus.FILED,
            "urgency_score": 95.0,
            "merit_score": 88.2,
            "petitioner": {"name": "Tech Solutions Inc", "lawyer": "Adv. Gupta"},
            "respondent": {"name": "Soft Systems Ltd", "lawyer": "Adv. Roy"},
            "filing_date": datetime.now() - timedelta(days=10),
            "next_hearing_date": datetime.now() + timedelta(days=30),
            "courtroom": "Room 305"
        }
    ]

    for data in cases_data:
        # Check if case exists
        existing = db.query(Case).filter(Case.case_number == data["case_number"]).first()
        if existing:
            continue
            
        case = Case(
            case_number=data["case_number"],
            case_type=data["case_type"],
            status=data["status"],
            urgency_score=data["urgency_score"],
            merit_score=data["merit_score"],
            petitioner=data["petitioner"],
            respondent=data["respondent"],
            filing_date=data["filing_date"],
            next_hearing_date=data["next_hearing_date"],
            courtroom=data["courtroom"],
            petition_text=f"Sample petition for {data['title']}. This is a detailed description of the legal facts and arguments.",
            judge_id=judge.id
        )
        db.add(case)

    db.commit()
    print(f"Successfully loaded {len(cases_data)} sample cases for demonstration.")

if __name__ == "__main__":
    load_sample_data()
