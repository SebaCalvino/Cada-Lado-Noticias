from .clarin import ClarinScraper
from .lanacion import LaNacionScraper
from .infobae import InfobaeScraper
from .pagina12 import Pagina12Scraper
from .ambito import AmbitoScraper
from .cronista import CronistaScraper
from .perfil import PerfilScraper
from .laizquierda import LaIzquierdaScraper
from .tn import TNScraper
from .eldestape import ElDestapeScraper
from .mdzol import MDZScraper
from .minutouno import MinutoUnoScraper

ALL_SCRAPERS = [
    ClarinScraper(),
    LaNacionScraper(),
    InfobaeScraper(),
    Pagina12Scraper(),
    AmbitoScraper(),
    CronistaScraper(),
    PerfilScraper(),
    LaIzquierdaScraper(),
    TNScraper(),
    ElDestapeScraper(),
    MDZScraper(),
    MinutoUnoScraper(),
]
