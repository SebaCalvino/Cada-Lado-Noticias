from .base import BaseNewsScraper


class MDZScraper(BaseNewsScraper):
    source_slug = "mdzol"
    rss_url = "https://www.mdzol.com/rss/noticias.xml"
    base_url = "https://www.mdzol.com"
