from .base import BaseNewsScraper


class PerfilScraper(BaseNewsScraper):
    source_slug = "perfil"
    rss_url = "https://www.perfil.com/feed/"
    base_url = "https://www.perfil.com"
