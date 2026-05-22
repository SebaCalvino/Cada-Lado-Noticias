"""
Fetch recent tweets from key Argentine public figures via Nitter RSS.
Nitter is an open-source Twitter/X frontend that exposes RSS without API keys.
Called on-demand per cluster, not during the scraping pipeline.
"""
import asyncio
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
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

TRACKED_ACCOUNTS = [
    ("JMilei",            "Javier Milei"),
    ("CFKArgentina",      "Cristina Kirchner"),
    ("AxelKicillof",      "Axel Kicillof"),
    ("mauriciomacri",     "Mauricio Macri"),
    ("PatoBullrich",      "Patricia Bullrich"),
    ("SergioMassa",       "Sergio Massa"),
    ("MartinLousteau",    "Martín Lousteau"),
    ("VickyVillarruel",   "Victoria Villarruel"),
    ("horaciolarreta",    "Horacio Larreta"),
    ("madorni",           "Manuel Adorni"),
    ("GuglielmoPonce",    "Agustín Romo"),
    ("mariaeugeniavidal", "María Eugenia Vidal"),
]

_STOP_WORDS = {
    "el", "la", "los", "las", "un", "una", "de", "del", "en", "y", "a",
    "que", "por", "con", "se", "es", "su", "al", "lo", "le", "no", "si",
    "más", "como", "pero", "para", "fue", "ser", "hay", "ya", "también",
    "este", "esta", "esto", "son", "han", "con", "una", "sus", "les",
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


async def _fetch_user_rss(username: str, display_name: str) -> List[ScrapedTweet]:
    for instance in NITTER_INSTANCES:
        try:
            url = f"{instance}/{username}/rss"
            async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
                resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible)"})
            if resp.status_code != 200:
                continue
            feed = feedparser.parse(resp.text)
            tweets = []
            for entry in feed.entries[:25]:
                text = _clean_text(entry.get("summary") or entry.get("title") or "")
                if len(text) < 30:
                    continue
                pub: Optional[datetime] = None
                if getattr(entry, "published_parsed", None):
                    pub = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                tweets.append(ScrapedTweet(
                    username=username,
                    display_name=display_name,
                    text=text[:600],
                    tweet_url=entry.get("link", ""),
                    published_at=pub or datetime.now(timezone.utc),
                ))
            if tweets:
                return tweets
        except Exception as e:
            logger.debug(f"Nitter {instance} failed for @{username}: {e}")
    return []


def _relevance(tweet: ScrapedTweet, keywords: List[str]) -> float:
    text_lower = tweet.text.lower()
    return sum(1.0 for kw in keywords if kw.lower() in text_lower) / max(len(keywords), 1)


async def get_tweets_for_cluster(
    title: str,
    key_facts: Optional[List[str]] = None,
) -> List[ScrapedTweet]:
    words: List[str] = []
    for token in title.split():
        w = token.strip(".,;:!?()\"'¿¡")
        if len(w) > 3 and w.lower() not in _STOP_WORDS:
            words.append(w)
    if key_facts:
        for fact in (key_facts or [])[:3]:
            for token in fact.split():
                w = token.strip(".,;:!?()\"'")
                if len(w) > 4 and w.lower() not in _STOP_WORDS:
                    words.append(w)
    keywords = list(dict.fromkeys(words))[:12]
    if not keywords:
        return []

    tasks = [_fetch_user_rss(u, n) for u, n in TRACKED_ACCOUNTS]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    scored: List[tuple[float, ScrapedTweet]] = []
    for res in results:
        if isinstance(res, Exception) or not res:
            continue
        for tweet in res:
            s = _relevance(tweet, keywords)
            if s >= 0.12:
                scored.append((s, tweet))

    scored.sort(key=lambda x: (x[0], x[1].published_at.timestamp()), reverse=True)

    # One tweet per person, max 5 total
    seen: set[str] = set()
    out: List[ScrapedTweet] = []
    for _, tweet in scored:
        if tweet.username not in seen:
            seen.add(tweet.username)
            out.append(tweet)
        if len(out) >= 5:
            break
    return out
