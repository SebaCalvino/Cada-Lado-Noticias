from .base import BaseNewsScraper


class InfobaeScraper(BaseNewsScraper):
    source_slug = "infobae"
    rss_url = "https://www.infobae.com/feeds/rss/argentina/"
    base_url = "https://www.infobae.com"
