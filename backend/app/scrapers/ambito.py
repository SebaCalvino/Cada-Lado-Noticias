from .base import BaseNewsScraper


class AmbitoScraper(BaseNewsScraper):
    source_slug = "ambito"
    rss_url = "https://www.ambito.com/rss/pages/home.xml"
    base_url = "https://www.ambito.com"
