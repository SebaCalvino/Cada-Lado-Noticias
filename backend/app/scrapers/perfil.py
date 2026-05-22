from .base import BaseNewsScraper


class PerfilScraper(BaseNewsScraper):
    source_slug = "perfil"
    rss_url = "https://www.perfil.com/arc/outboundfeeds/rss/"
    base_url = "https://www.perfil.com"
