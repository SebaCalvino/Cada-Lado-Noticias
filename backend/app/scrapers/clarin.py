from .base import BaseNewsScraper


class ClarinScraper(BaseNewsScraper):
    source_slug = "clarin"
    rss_url = "https://www.clarin.com/rss/lo-ultimo/"
    base_url = "https://www.clarin.com"
