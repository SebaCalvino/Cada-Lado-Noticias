from .base import BaseNewsScraper


class CronistaScraper(BaseNewsScraper):
    source_slug = "cronista"
    rss_url = "https://www.cronista.com/feed/"
    base_url = "https://www.cronista.com"
