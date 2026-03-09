import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-in-production")

    # PostgreSQL
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "postgresql://sierratrac:password@localhost:5432/sierratrac"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Azure Blob Storage (for photos)
    AZURE_STORAGE_CONNECTION_STRING = os.environ.get("AZURE_STORAGE_CONNECTION_STRING", "")
    AZURE_CONTAINER_NAME = os.environ.get("AZURE_CONTAINER_NAME", "instrument-photos")

    # File upload limits
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "pdf"}

    # SierraTrac ID prefix
    SIERRATRAC_PREFIX = "ST"


class DevelopmentConfig(Config):
    DEBUG = True
    # Use local file storage instead of Azure during development
    USE_LOCAL_STORAGE = True
    LOCAL_UPLOAD_FOLDER = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "static", "uploads"
    )


class ProductionConfig(Config):
    DEBUG = False
    USE_LOCAL_STORAGE = False


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
