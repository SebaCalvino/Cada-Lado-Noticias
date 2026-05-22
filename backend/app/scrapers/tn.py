from .base import BaseNewsScraper


class TNScraper(BaseNewsScraper):
    source_slug = "tn"
    rss_url = "https://tn.com.ar/rss.xml"
    base_url = "https://tn.com.ar"
