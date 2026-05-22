from .base import BaseNewsScraper


class LaIzquierdaScraper(BaseNewsScraper):
    source_slug = "laizquierda"
    rss_url = "https://www.telam.com.ar/rss/portada.xml"
    base_url = "https://www.telam.com.ar"
