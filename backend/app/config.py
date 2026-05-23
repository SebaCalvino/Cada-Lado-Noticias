from pydantic_settings import BaseSettings
from typing import List
import os


def _fix_db_url(url: str) -> str:
    """Convert postgres:// or postgresql:// to postgresql+asyncpg:// for asyncpg driver."""
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


class Settings(BaseSettings):
    AI_PROVIDER: str = "groq"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    OLLAMA_URL: str = "http://host.docker.internal:11434"
    OLLAMA_MODEL: str = "llama3.1:8b"

    DATABASE_URL: str = "postgresql+asyncpg://cadalado:cadalado@db:5432/cadalado"
    SECRET_KEY: str = "dev-secret-change-in-prod"

    BACKEND_CORS_ORIGINS: str = "*"
    CLUSTERING_THRESHOLD: float = 0.12
    ARTICLES_PER_SCRAPE: int = 30

    CRON_SECRET: str = ""
    ENABLE_SCHEDULER: bool = False

    @property
    def database_url_async(self) -> str:
        return _fix_db_url(self.DATABASE_URL)

    @property
    def cors_origins(self) -> List[str]:
        raw = self.BACKEND_CORS_ORIGINS.strip()
        if raw == "*":
            return ["*"]
        if raw.startswith("["):
            import json
            try:
                return json.loads(raw)
            except Exception:
                pass
        return [o.strip() for o in raw.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()