from .base import BaseNewsScraper


class LaNacionScraper(BaseNewsScraper):
    source_slug = "lanacion"
    rss_url = "https://www.lanacion.com.ar/arc/outboundfeeds/rss/"
    base_url = "https://www.lanacion.com.ar"
