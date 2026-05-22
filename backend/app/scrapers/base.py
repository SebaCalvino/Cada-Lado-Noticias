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
        """Fetch og:image for articles that have no image from RSS (parallel, max 8)."""
        no_image = [a for a in articles if not a.image_url][:8]
        if not no_image:
            return
        tasks = [self._fetch_og_image(a.url) for a in no_image]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for art, img in zip(no_image, results):
            if isinstance(img, str) and img:
                art.image_url = img

    @staticmethod
    async def _fetch_og_image(url: str) -> Optional[str]:
        try:
            async with httpx.AsyncClient(headers=HEADERS, timeout=8, follow_redirects=True) as client:
                resp = await client.get(url)
            if resp.status_code != 200:
                return None
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(resp.text, "lxml")
            for attr in ("og:image", "twitter:image"):
                tag = soup.find("meta", property=attr) or soup.find("meta", attrs={"name": attr})
                if tag and tag.get("content", "").startswith("http"):
                    return tag["content"]
        except Exception:
            pass
        return None

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
