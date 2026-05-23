"""
Busca tweets recientes SOBRE una noticia específica vía Nitter search RSS.
No usa timelines de usuarios fijos — busca por el evento concreto del cluster.
Solo retorna resultados si son genuinamente relevantes y recientes (< 24h).
"""
import logging
import re
import urllib.parse
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import feedparser
import httpx

logger = logging.getLogger(__name__)

NITTER_INSTANCES = [
    "https://nitter.poast.org",
    "https://nitter.privacydev.net",
    "https://nitter.1d4.us",
    "https://nitter.net",
]

_STOP_WORDS = {
    "el", "la", "los", "las", "un", "una", "de", "del", "en", "y", "a",
    "que", "por", "con", "se", "es", "su", "al", "lo", "le", "no", "si",
    "más", "como", "pero", "para", "fue", "ser", "hay", "ya", "también",
    "este", "esta", "esto", "son", "han", "sus", "les", "sobre", "fue",
    "tras", "ante", "bajo", "desde", "hasta", "hacia", "entre", "según",
}


@dataclass
class ScrapedTweet:
    username: str
    display_name: str
    text: str
    tweet_url: str
    published_at: datetime


def _clean_text(raw: str) -> str:
    raw = re.sub(r'<[^>]+>', ' ', raw)
    raw = re.sub(r'https?://\S+', '', raw)
    raw = re.sub(r'\s+', ' ', raw)
    return raw.strip()


def _extract_username(link: str) -> str:
    """Extract Twitter username from a Nitter status URL."""
    if "/status/" not in link:
        return ""
    parts = link.rstrip("/").split("/")
    try:
        idx = next(i for i, p in enumerate(parts) if p == "status")
        return parts[idx - 1] if idx > 0 else ""
    except StopIteration:
        return ""


def _extract_display_name(entry) -> str:
    author = entry.get("author", "")
    # Nitter sometimes: "Display Name / @username"
    if " / " in author:
        return author.split(" / ")[0].strip()
    if author.startswith("@"):
        return author[1:]
    return author.strip()


def _build_query(title: str, key_facts: Optional[List[str]]) -> str:
    """Build a tight 3-4 word query from the most distinctive words."""
    words: List[str] = []
    for token in title.split():
        w = token.strip(".,;:!?()\"'¿¡«»")
        if len(w) > 3 and w.lower() not in _STOP_WORDS and not w.isdigit():
            words.append(w)

    if key_facts:
        for fact in key_facts[:2]:
            for token in fact.split():
                w = token.strip(".,;:!?()\"'")
                if len(w) > 5 and w.lower() not in _STOP_WORDS and w not in words:
                    words.append(w)

    # Keep the 4 most distinctive (longest) words as they're more specific
    words = sorted(set(words), key=len, reverse=True)[:4]
    return " ".join(words)


def _relevance(text: str, keywords: List[str]) -> float:
    text_lower = text.lower()
    return sum(1.0 for kw in keywords if kw.lower() in text_lower) / max(len(keywords), 1)


async def _search_nitter(query: str) -> List[ScrapedTweet]:
    encoded = urllib.parse.quote(query)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    for instance in NITTER_INSTANCES:
        try:
            url = f"{instance}/search/rss?f=tweets&q={encoded}"
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible)"})
            if resp.status_code != 200:
                continue

            feed = feedparser.parse(resp.text)
            if not feed.entries:
                continue

            tweets: List[ScrapedTweet] = []
            for entry in feed.entries[:40]:
                text = _clean_text(entry.get("summary") or entry.get("title") or "")
                if len(text) < 30:
                    continue
                # Skip retweets — they're not original opinions
                if text.startswith("RT @"):
                    continue

                link = entry.get("link", "")
                username = _extract_username(link)
                display = _extract_display_name(entry)

                pub: Optional[datetime] = None
                if getattr(entry, "published_parsed", None):
                    pub = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)

                # Only include recent tweets
                if pub and pub < cutoff:
                    continue

                tweets.append(ScrapedTweet(
                    username=username or "twitter_user",
                    display_name=display or username or "Usuario",
                    text=text[:500],
                    tweet_url=link,
                    published_at=pub or datetime.now(timezone.utc),
                ))

            if tweets:
                logger.info(f"Nitter search at {instance}: {len(tweets)} recent tweets for '{query}'")
                return tweets

        except Exception as e:
            logger.debug(f"Nitter search {instance} failed: {e}")

    return []


async def get_tweets_for_cluster(
    title: str,
    key_facts: Optional[List[str]] = None,
) -> List[ScrapedTweet]:
    """
    Returns tweets specifically about this news event, or empty list if none found.
    Never returns irrelevant results to fill space.
    """
    query = _build_query(title, key_facts)
    if not query or len(query.split()) < 2:
        return []

    all_tweets = await _search_nitter(query)
    if not all_tweets:
        return []

    # Score by keyword relevance — require 2+ keywords to match
    keywords = [w for w in query.split() if len(w) > 2]
    scored = [
        (t, _relevance(t.text, keywords))
        for t in all_tweets
        if _relevance(t.text, keywords) >= 0.40  # strict: at least 40% of keywords
    ]

    if not scored:
        return []

    # Sort by relevance then recency
    scored.sort(key=lambda x: (x[1], x[0].published_at.timestamp()), reverse=True)

    # Deduplicate by username — one tweet per person
    seen: set[str] = set()
    out: List[ScrapedTweet] = []
    for tweet, _ in scored:
        if tweet.username not in seen:
            seen.add(tweet.username)
            out.append(tweet)
        if len(out) >= 5:
            break

    return out
