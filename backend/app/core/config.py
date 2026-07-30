from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union

class Settings(BaseSettings):
    PROJECT_NAME: str = "Nyaya-Gati"
    API_V1_STR: str = "/api/v1"
    
    # Database Settings
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "nyayagati"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/nyayagati"
    
    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Elasticsearch
    ELASTICSEARCH_URL: str = "http://localhost:9200"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost", "http://localhost:80", "http://localhost:3000"]
    
    # JWT Settings
    SECRET_KEY: str = "TODO_CHANGE_THIS_SECRET_KEY_FOR_PRODUCTION"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

settings = Settings()
