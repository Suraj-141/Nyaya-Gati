from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1 import router as api_router
from app.core.config import settings
from app.db.base import engine, Base
from datetime import datetime
import logging
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import all models here so metadata is collected before create_all
import app.models 

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Nyaya-Gati API",
    description="AI-powered judicial case management system for Indian courts",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS middleware (allow frontend to make requests)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Health check endpoint (used by Docker HEALTHCHECK and load balancers)
@app.get("/health", tags=["Health"])
async def health_check():
    """Deep health check — verifies DB, Redis, and ML model availability."""
    health: dict = {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "components": {},
    }
    http_status = 200

    # ── PostgreSQL check ──────────────────────────────────────────────────────
    try:
        t0 = time.monotonic()
        with engine.connect() as conn:
            conn.execute(engine.dialect.statement_compiler(
                engine.dialect, None  # type: ignore
            ).__class__.__new__(engine.dialect.statement_compiler.__class__))
        # Simpler approach
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        health["components"]["database"] = {
            "status": "ok",
            "latency_ms": round((time.monotonic() - t0) * 1000, 2),
        }
    except Exception as e:
        health["components"]["database"] = {"status": "error", "detail": str(e)}
        health["status"] = "degraded"
        http_status = 503

    # ── Redis check ───────────────────────────────────────────────────────────
    try:
        import redis
        url = getattr(settings, 'REDIS_URL', 'redis://redis:6379/0')
        t0 = time.monotonic()
        r = redis.from_url(url, socket_connect_timeout=2)
        r.ping()
        health["components"]["redis"] = {
            "status": "ok",
            "latency_ms": round((time.monotonic() - t0) * 1000, 2),
        }
    except Exception as e:
        health["components"]["redis"] = {"status": "unavailable", "detail": str(e)}
        # Redis degraded but not critical — don't set 503

    # ── ML models check ───────────────────────────────────────────────────────
    try:
        from app.ml.model_loader import models_loaded
        health["components"]["ml_models"] = {
            "status": "ok" if models_loaded() else "not_loaded"
        }
    except Exception:
        health["components"]["ml_models"] = {"status": "not_loaded"}

    return JSONResponse(content=health, status_code=http_status)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("Nyaya-Gati API starting up...")
    # Load ML models
    try:
        from app.ml.model_loader import load_models
        load_models()
        logger.info("ML models loaded successfully")
    except ImportError:
        logger.warning("ML models loader not implemented yet. Skipping.")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Nyaya-Gati API shutting down...")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Development only
        log_level="info"
    )
