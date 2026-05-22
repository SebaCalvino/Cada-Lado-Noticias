import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.pipeline import run_scraping_pipeline

logger = logging.getLogger(__name__)


def create_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()

    # Run every 30 minutes — scrapes all sources and clusters new articles as they appear
    scheduler.add_job(
        run_scraping_pipeline,
        IntervalTrigger(minutes=30),
        id="scrape_continuous",
        name="Scraping continuo",
        max_instances=1,
        coalesce=True,
    )

    return scheduler
