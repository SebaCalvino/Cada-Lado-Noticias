from .base import BaseNewsScraper


class MinutoUnoScraper(BaseNewsScraper):
    source_slug = "minutouno"
    rss_url = "https://www.minutouno.com/rss.xml"
    base_url = "https://www.minutouno.com"
