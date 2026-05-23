import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional

import feedparser
import httpx

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; CadaLadoBot/1.0; +https://cadalado.com.ar/bot)"
    )
}

# Headers de navegador real — algunos medios bloquean bots para el HTML completo
BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "es-AR,es;q=0.9,en;q=0.6",
}

_IMG_EXTS = (".jpg", ".jpeg", ".png", ".webp", ".avif")


async def fetch_og_image(url: str) -> Optional[str]:
    """
    Extrae la imagen principal de un artículo desde su HTML.
    Prioridad: og:image > twitter:image > link image_src > primer <img> grande.
    Función módulo-nivel para que el pipeline pueda garantizar imágenes.
    """
    try:
        async with httpx.AsyncClient(
            headers=BROWSER_HEADERS, timeout=12, follow_redirects=True
        ) as client:
            resp = await client.get(url)
        if resp.status_code != 200 or not resp.text:
            return None

        from bs4 import BeautifulSoup
        soup = BeautifulSoup(resp.text, "lxml")

        # Meta tags estándar (og:image es la foto hero del artículo)
        for prop in ("og:image", "og:image:url", "og:image:secure_url",
                     "twitter:image", "twitter:image:src"):
            tag = soup.find("meta", property=prop) or soup.find("meta", attrs={"name": prop})
            if tag:
                content = (tag.get("content") or "").strip()
                if content.startswith("http"):
                    return content

        # link rel=image_src
        link = soup.find("link", rel="image_src")
        if link:
            href = (link.get("href") or "").strip()
            if href.startswith("http"):
                return href

        # Fallback: primer <img> con extensión de imagen real dentro del cuerpo
        for img in soup.find_all("img"):
            src = (img.get("src") or img.get("data-src") or "").strip()
            if src.startswith("http") and any(e in src.lower() for e in _IMG_EXTS):
                return src

    except Exception as e:
        logger.debug(f"og:image fetch failed for {url}: {e}")
    return None


@dataclass
class ArticleData:
    title: str
    url: str
    source_slug: str
    summary: str = ""
    published_at: Optional[datetime] = None
    category: str = ""
    image_url: str = ""


class BaseNewsScraper(ABC):
    source_slug: str = ""
    rss_url: str = ""
    base_url: str = ""

    async def get_articles(self) -> List[ArticleData]:
        try:
            articles = await self._fetch_from_rss()
            await self._enrich_images(articles)
            return articles
        except Exception as e:
            logger.error(f"[{self.source_slug}] RSS failed: {e}")
            return []

    async def _enrich_images(self, articles: List[ArticleData]) -> None:
        """Fetch og:image for articles without an RSS image (parallel, in batches)."""
        no_image = [a for a in articles if not a.image_url]
        if not no_image:
            return
        # Procesar en lotes de 10 para no abrir demasiadas conexiones a la vez
        for i in range(0, len(no_image), 10):
            batch = no_image[i:i + 10]
            tasks = [fetch_og_image(a.url) for a in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for art, img in zip(batch, results):
                if isinstance(img, str) and img:
                    art.image_url = img

    async def _fetch_from_rss(self) -> List[ArticleData]:
        async with httpx.AsyncClient(headers=HEADERS, timeout=20, follow_redirects=True) as client:
            resp = await client.get(self.rss_url)
            resp.raise_for_status()
            feed = feedparser.parse(resp.text)

        articles = []
        for entry in feed.entries[:30]:
            title = entry.get("title", "").strip()
            url = entry.get("link", "").strip()
            if not title or not url:
                continue

            summary = entry.get("summary", "") or entry.get("description", "")
            summary = self._clean_html(summary)[:500]

            published_at = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                try:
                    published_at = datetime(*entry.published_parsed[:6])
                except Exception:
                    pass

            # Extract image URL with priority order
            image_url = ""
            try:
                if hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
                    candidate = entry.media_thumbnail[0].get("url", "")
                    if candidate.startswith("http"):
                        image_url = candidate
            except Exception:
                pass
            if not image_url:
                try:
                    if hasattr(entry, "media_content") and entry.media_content:
                        candidate = entry.media_content[0].get("url", "")
                        if candidate.startswith("http"):
                            image_url = candidate
                except Exception:
                    pass
            if not image_url:
                try:
                    if hasattr(entry, "enclosures") and entry.enclosures:
                        href = entry.enclosures[0].get("href", "")
                        if href.startswith("http") and any(href.lower().endswith(ext) for ext in (".jpg", ".png", ".webp", ".jpeg")):
                            image_url = href
                except Exception:
                    pass

            articles.append(ArticleData(
                title=title,
                url=url,
                source_slug=self.source_slug,
                summary=summary,
                published_at=published_at,
                image_url=image_url,
            ))

        return articles

    @staticmethod
    def _clean_html(text: str) -> str:
        from bs4 import BeautifulSoup
        if not text:
            return ""
        return BeautifulSoup(text, "lxml").get_text(separator=" ").strip()
