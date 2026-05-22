import asyncio
import logging
import re
import json
import httpx
from typing import List
from dataclasses import dataclass

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


@dataclass
class ScrapedComment:
    author: str
    text: str
    votes: int = 0
    source_slug: str = ""
    source_name: str = ""


async def _fetch_coral_comments(article_url: str, source_slug: str, source_name: str) -> List[ScrapedComment]:
    """
    Fetches comments from a Coral Talk instance.
    Detects the root URL from the page HTML, falls back to known endpoints.
    """
    CORAL_ROOTS = {
        "lanacion": "https://comentarios.lanacion.com.ar",
        "infobae": "https://comentarios.infobae.com",
        "clarin": "https://comentarios.clarin.com",
        "perfil": "https://comentarios.perfil.com",
    }

    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=15, follow_redirects=True) as client:
            resp = await client.get(article_url)
            if resp.status_code != 200:
                return []
            html = resp.text

        # Try to extract Coral rootURL from page JS
        coral_match = (
            re.search(r'["\']rootURL["\']\s*:\s*["\']([^"\']+)["\']', html)
            or re.search(r'data-talk-url=["\']([^"\']+)["\']', html)
            or re.search(r'CoralStreamEmbed\.create\([^)]*rootURL["\']?\s*:\s*["\']([^"\']+)', html, re.S)
        )

        if coral_match:
            coral_root = coral_match.group(1).rstrip('/')
        elif source_slug in CORAL_ROOTS:
            coral_root = CORAL_ROOTS[source_slug]
        else:
            return []

        # Try to find the canonical story URL embedded in the page
        story_match = (
            re.search(r'["\']storyURL["\']\s*:\s*["\']([^"\']+)["\']', html)
            or re.search(r'["\']asset_url["\']\s*:\s*["\']([^"\']+)["\']', html)
        )
        story_url = story_match.group(1) if story_match else article_url

        gql_query = """
        query GetComments($url: String!) {
          story(url: $url) {
            comments(first: 50, orderBy: REACTION_COUNT_DESC, flat: true) {
              nodes {
                body
                author { username }
                reactionCounts { REACTION }
              }
            }
          }
        }
        """

        async with httpx.AsyncClient(headers=HEADERS, timeout=15) as client:
            resp = await client.post(
                f"{coral_root}/api/graphql",
                json={"query": gql_query, "variables": {"url": story_url}},
                headers={**HEADERS, "Content-Type": "application/json"},
            )
            if resp.status_code != 200:
                return []
            data = resp.json()

        nodes = (
            (data.get("data") or {})
            .get("story") or {}
        ).get("comments", {}).get("nodes", []) or []

        result = []
        for node in nodes:
            text = (node.get("body") or "").strip()
            if len(text) < 25:
                continue
            author = ((node.get("author") or {}).get("username") or "Lector")
            votes = ((node.get("reactionCounts") or {}).get("REACTION") or 0)
            result.append(ScrapedComment(
                author=author, text=text, votes=votes,
                source_slug=source_slug, source_name=source_name,
            ))

        return sorted(result, key=lambda c: c.votes, reverse=True)[:25]

    except Exception as e:
        logger.debug(f"[comments] {source_slug} {article_url}: {e}")
        return []


async def get_all_cluster_comments(
    articles: List[dict],  # list of {"url": str, "source_slug": str, "source_name": str}
) -> List[ScrapedComment]:
    """
    Fetches comments from ALL articles in a cluster in parallel (single gather).
    Returns the combined deduplicated list sorted by votes.
    """
    tasks = [
        _fetch_coral_comments(a["url"], a["source_slug"], a["source_name"])
        for a in articles
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    seen_texts: set = set()
    all_comments: List[ScrapedComment] = []
    for res in results:
        if isinstance(res, Exception):
            continue
        for c in res:
            key = c.text[:80].lower()
            if key not in seen_texts:
                seen_texts.add(key)
                all_comments.append(c)

    return sorted(all_comments, key=lambda c: c.votes, reverse=True)
