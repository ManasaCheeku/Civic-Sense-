import os
import logging
import secrets
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "CivicSense AI API"
    ENV: str = os.getenv("ENV", "development")

    # Database Settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./civicsense.db")

    # Security Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
    )
    DEMO_ACCOUNTS_ENABLED: bool = os.getenv("DEMO_ACCOUNTS_ENABLED", "true").lower() in {"1", "true", "yes", "on"}

    # Directories
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads")
    REPORT_DIR: str = os.path.join(BASE_DIR, "reports")
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()

if not settings.SECRET_KEY:
    logging.getLogger("Config").warning(
        "SECRET_KEY is not set. Using an ephemeral runtime JWT secret; set SECRET_KEY in the environment for stable sessions."
    )
    settings.SECRET_KEY = secrets.token_urlsafe(48)

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.REPORT_DIR, exist_ok=True)
