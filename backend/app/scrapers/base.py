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


class BaseNewsScraper(ABC):
    source_slug: str = ""
    rss_url: str = ""
    base_url: str = ""

    async def get_articles(self) -> List[ArticleData]:
        try:
            return await self._fetch_from_rss()
        except Exception as e:
            logger.error(f"[{self.source_slug}] RSS failed: {e}")
            return []

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

            articles.append(ArticleData(
                title=title,
                url=url,
                source_slug=self.source_slug,
                summary=summary,
                published_at=published_at,
            ))

        return articles

    @staticmethod
    def _clean_html(text: str) -> str:
        from bs4 import BeautifulSoup
        if not text:
            return ""
        return BeautifulSoup(text, "lxml").get_text(separator=" ").strip()
