import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

from app.pipeline import run_scraping_pipeline

logger = logging.getLogger(__name__)

AR_TZ = pytz.timezone("America/Argentina/Buenos_Aires")


def create_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone=AR_TZ)

    scheduler.add_job(
        run_scraping_pipeline,
        CronTrigger(hour=7, minute=0, timezone=AR_TZ),
        id="scrape_morning",
        name="Scraping matutino",
    )
    scheduler.add_job(
        run_scraping_pipeline,
        CronTrigger(hour=13, minute=0, timezone=AR_TZ),
        id="scrape_afternoon",
        name="Scraping vespertino",
    )
    scheduler.add_job(
        run_scraping_pipeline,
        CronTrigger(hour=19, minute=0, timezone=AR_TZ),
        id="scrape_evening",
        name="Scraping nocturno",
    )

    return scheduler
