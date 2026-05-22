from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # IA: "groq", "anthropic" o "ollama"
    AI_PROVIDER: str = "groq"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    ANTHROPIC_API_KEY: str = ""
    OLLAMA_URL: str = "http://host.docker.internal:11434"
    OLLAMA_MODEL: str = "llama3.1:8b"

    DATABASE_URL: str = "postgresql+asyncpg://cadalado:cadalado@db:5432/cadalado"
    SECRET_KEY: str = "dev-secret-change-in-prod"
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    CLUSTERING_THRESHOLD: float = 0.15
    ARTICLES_PER_SCRAPE: int = 30

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
