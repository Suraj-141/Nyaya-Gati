import sys
import os
from sqlalchemy.orm import Session

# Add the app directory to the path so we can import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.base import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash

def create_admin():
    db: Session = SessionLocal()
    
    admin_email = "admin@demo.com"
    admin_password = "demo123"
    
    # Check if admin already exists
    user = db.query(User).filter(User.email == admin_email).first()
    if user:
        print(f"User {admin_email} already exists.")
        return

    admin_user = User(
        email=admin_email,
        hashed_password=get_password_hash(admin_password),
        full_name="System Administrator",
        role=UserRole.ADMIN,
        is_active=True
    )
    
    db.add(admin_user)
    
    # Also create a demo judge
    judge_user = User(
        email="judge@demo.com",
        hashed_password=get_password_hash("demo123"),
        full_name="Hon. Justice Kumar",
        role=UserRole.JUDGE,
        is_active=True
    )
    db.add(judge_user)
    
    # Also create a demo litigant
    litigant_user = User(
        email="litigant@demo.com",
        hashed_password=get_password_hash("demo123"),
        full_name="Rajesh Sharma",
        role=UserRole.LITIGANT,
        is_active=True
    )
    db.add(litigant_user)
    
    db.commit()
    print("Successfully created admin, judge, and litigant demo accounts.")
    print(f"Credentials: email / demo123")

if __name__ == "__main__":
    create_admin()
