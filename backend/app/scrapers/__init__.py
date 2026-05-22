from .clarin import ClarinScraper
from .lanacion import LaNacionScraper
from .infobae import InfobaeScraper
from .pagina12 import Pagina12Scraper
from .ambito import AmbitoScraper
from .cronista import CronistaScraper
from .perfil import PerfilScraper
from .laizquierda import LaIzquierdaScraper

ALL_SCRAPERS = [
    ClarinScraper(),
    LaNacionScraper(),
    InfobaeScraper(),
    Pagina12Scraper(),
    AmbitoScraper(),
    CronistaScraper(),
    PerfilScraper(),
    LaIzquierdaScraper(),
]
