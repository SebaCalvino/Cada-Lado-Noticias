from .base import BaseNewsScraper


class Pagina12Scraper(BaseNewsScraper):
    source_slug = "pagina12"
    rss_url = "https://www.pagina12.com.ar/rss/secciones/el-pais"
    base_url = "https://www.pagina12.com.ar"
