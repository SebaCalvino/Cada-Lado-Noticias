import logging
import re
import json
import httpx
from typing import List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; CadaLadoBot/1.0)"}

@dataclass
class ScrapedComment:
    author: str
    text: str
    votes: int = 0

async def get_lanacion_comments(article_url: str) -> List[ScrapedComment]:
    """
    Intenta obtener comentarios de un artículo de La Nación.
    Busca la configuración de Coral Talk en el HTML de la página.
    Retorna lista vacía si falla por cualquier motivo.
    """
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=15, follow_redirects=True) as client:
            resp = await client.get(article_url)
            if resp.status_code != 200:
                return []
            html = resp.text

        # Buscar URL del servidor Coral Talk en el HTML
        coral_match = re.search(
            r'["\']rootURL["\']\s*:\s*["\']([^"\']+)["\']', html
        ) or re.search(
            r'data-talk-url=["\']([^"\']+)["\']', html
        )

        if not coral_match:
            # Intentar URL conocida para La Nación
            coral_root = "https://comentarios.lanacion.com.ar"
        else:
            coral_root = coral_match.group(1).rstrip('/')

        # Buscar story URL embebida o usar la URL del artículo
        story_url_match = re.search(
            r'["\']storyURL["\']\s*:\s*["\']([^"\']+)["\']', html
        ) or re.search(
            r'["\']asset_url["\']\s*:\s*["\']([^"\']+)["\']', html
        )
        story_url = story_url_match.group(1) if story_url_match else article_url

        # GraphQL query para Coral Talk
        query = """
        query GetStoryComments($url: String!) {
          story(url: $url) {
            comments(first: 30, orderBy: REACTION_COUNT_DESC, flat: true) {
              nodes {
                body
                author { username }
                reactionCounts { REACTION }
                createdAt
              }
            }
          }
        }
        """

        async with httpx.AsyncClient(headers=HEADERS, timeout=15) as client:
            resp = await client.post(
                f"{coral_root}/api/graphql",
                json={"query": query, "variables": {"url": story_url}},
                headers={**HEADERS, "Content-Type": "application/json"},
            )
            if resp.status_code != 200:
                return []
            data = resp.json()

        nodes = (
            data.get("data", {})
            .get("story", {}) or {}
        ).get("comments", {}).get("nodes", [])

        comments = []
        for node in nodes:
            text = (node.get("body") or "").strip()
            if not text or len(text) < 20:
                continue
            author = (node.get("author") or {}).get("username", "Lector")
            votes = (node.get("reactionCounts") or {}).get("REACTION", 0)
            comments.append(ScrapedComment(author=author, text=text, votes=votes))

        return sorted(comments, key=lambda c: c.votes, reverse=True)[:20]

    except Exception as e:
        logger.debug(f"Comment scraping failed for {article_url}: {e}")
        return []
