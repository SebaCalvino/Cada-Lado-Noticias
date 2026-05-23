import logging

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import init_db, engine
from app.api.routes import router
from app.pipeline import ensure_sources, run_scraping_pipeline
from app.database import AsyncSessionLocal

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Cada Lado Noticias API",
    description="API para síntesis neutral de noticias argentinas",
    version="1.0.0",
)

_cors = settings.cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors,
    allow_credentials="*" not in _cors,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

if settings.ENABLE_SCHEDULER:
    from app.scheduler import create_scheduler
    scheduler = create_scheduler()


@app.on_event("startup")
async def startup():
    logger.info("Initializing database...")
    await init_db()
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE raw_articles ADD COLUMN IF NOT EXISTS image_url TEXT"))
        await conn.execute(text("ALTER TABLE news_clusters ADD COLUMN IF NOT EXISTS image_url TEXT"))
        await conn.execute(text("""CREATE TABLE IF NOT EXISTS cluster_comments (
            id SERIAL PRIMARY KEY,
            cluster_id INTEGER REFERENCES news_clusters(id) ON DELETE CASCADE,
            source_slug VARCHAR(50) DEFAULT 'lanacion',
            author VARCHAR(200),
            text TEXT NOT NULL,
            sentiment VARCHAR(20),
            votes INTEGER DEFAULT 0,
            scraped_at TIMESTAMP DEFAULT NOW()
        )"""))
    async with AsyncSessionLocal() as db:
        await ensure_sources(db)
    if settings.ENABLE_SCHEDULER:
        scheduler.start()
        logger.info("Scheduler started")


@app.on_event("shutdown")
async def shutdown():
    if settings.ENABLE_SCHEDULER:
        scheduler.shutdown()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/wake")
async def wake():
    """Keep-alive endpoint for Render free tier — called by cron-job.org every 10 min."""
    return {"status": "awake"}


@app.post("/api/cron/pipeline")
async def cron_pipeline(x_cron_secret: str = Header(default="")):
    if settings.CRON_SECRET and x_cron_secret != settings.CRON_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    logger.info("Cron triggered: running scraping pipeline")
    await run_scraping_pipeline()
    return {"status": "ok"}