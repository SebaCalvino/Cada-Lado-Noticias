import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.api.routes import router
from app.scheduler import create_scheduler
from app.pipeline import ensure_sources
from app.database import AsyncSessionLocal

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Cada Lado Noticias API",
    description="API para síntesis neutral de noticias argentinas",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

scheduler = create_scheduler()


@app.on_event("startup")
async def startup():
    logger.info("Initializing database...")
    await init_db()
    async with AsyncSessionLocal() as db:
        await ensure_sources(db)
    scheduler.start()
    logger.info("Scheduler started")


@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()


@app.get("/health")
async def health():
    return {"status": "ok"}
