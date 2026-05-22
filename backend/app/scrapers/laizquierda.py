from .base import BaseNewsScraper


class LaIzquierdaScraper(BaseNewsScraper):
    source_slug = "laizquierda"
    rss_url = "https://www.laizquierdadiario.com/spip.php?page=backend"
    base_url = "https://www.laizquierdadiario.com"
