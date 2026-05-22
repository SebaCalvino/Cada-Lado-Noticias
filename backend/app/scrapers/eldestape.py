from .base import BaseNewsScraper


class ElDestapeScraper(BaseNewsScraper):
    source_slug = "eldestape"
    rss_url = "https://www.eldestapeweb.com/feed"
    base_url = "https://www.eldestapeweb.com"
