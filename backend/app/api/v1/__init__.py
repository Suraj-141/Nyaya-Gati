from fastapi import APIRouter
from . import cases, users, schedules, auth

# Initialize main router
router = APIRouter()

# Register sub-routers
router.include_router(auth.router)
router.include_router(cases.router, prefix="/cases", tags=["cases"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(schedules.router, prefix="/schedules", tags=["schedules"])

@router.get("/")
def api_v1_root():
    return {"message": "Welcome to Nyaya-Gati API v1"}

