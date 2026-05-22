from .base import BaseNewsScraper


class PerfilScraper(BaseNewsScraper):
    source_slug = "perfil"
    rss_url = "https://www.perfil.com/?feed=rss2"
    base_url = "https://www.perfil.com"
