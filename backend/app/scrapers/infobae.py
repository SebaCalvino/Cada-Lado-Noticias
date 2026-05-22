from .base import BaseNewsScraper


class InfobaeScraper(BaseNewsScraper):
    source_slug = "infobae"
    rss_url = "https://www.infobae.com/arc/outboundfeeds/rss/"
    base_url = "https://www.infobae.com"
