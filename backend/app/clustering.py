import logging
from dataclasses import dataclass
from typing import List, Dict, Tuple

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.config import settings

logger = logging.getLogger(__name__)

SPANISH_STOP_WORDS = [
    "de", "la", "que", "el", "en", "y", "a", "los", "del", "se", "las",
    "por", "un", "para", "con", "una", "su", "al", "lo", "como", "más",
    "pero", "sus", "le", "ya", "o", "este", "sí", "porque", "esta", "entre",
    "cuando", "muy", "sin", "sobre", "también", "me", "hasta", "hay", "donde",
    "quien", "desde", "todo", "nos", "durante", "todos", "uno", "les", "ni",
    "contra", "otros", "ese", "eso", "ante", "ellos", "e", "esto", "mí",
    "antes", "algunos", "qué", "unos", "yo", "otro", "otras", "otra", "él",
    "tanto", "esa", "estos", "mucho", "quienes", "nada", "muchos", "cual",
    "poco", "ella", "estar", "estas", "alguno", "alguna", "aunque", "siempre",
    "fue", "ser", "es", "son", "han", "ha", "tiene", "tienen", "había",
    "argentina", "argentino", "argentinos", "argentina", "años", "año",
]


@dataclass
class ArticleInput:
    id: int
    title: str
    summary: str
    source_slug: str


@dataclass
class Cluster:
    article_ids: List[int]
    source_slugs: List[str]
    representative_title: str
    similarity_scores: Dict[int, float]


def cluster_articles(articles: List[ArticleInput], threshold: float = None) -> List[Cluster]:
    if threshold is None:
        threshold = settings.CLUSTERING_THRESHOLD

    if len(articles) < 2:
        return []

    texts = [f"{a.title} {a.summary}" for a in articles]

    vectorizer = TfidfVectorizer(
        stop_words=SPANISH_STOP_WORDS,
        ngram_range=(1, 2),
        max_features=5000,
        sublinear_tf=True,
    )
    try:
        tfidf_matrix = vectorizer.fit_transform(texts)
    except Exception as e:
        logger.error(f"TF-IDF vectorization failed: {e}")
        return []

    sim_matrix = cosine_similarity(tfidf_matrix)

    n = len(articles)
    visited = [False] * n
    clusters: List[Cluster] = []

    for i in range(n):
        if visited[i]:
            continue

        cluster_indices = [i]
        visited[i] = True

        for j in range(i + 1, n):
            if not visited[j] and sim_matrix[i][j] >= threshold:
                # Only cluster if from different sources
                sources_in_cluster = {articles[k].source_slug for k in cluster_indices}
                if articles[j].source_slug not in sources_in_cluster:
                    cluster_indices.append(j)
                    visited[j] = True

        # Only create cluster if 2+ different sources
        source_slugs = [articles[k].source_slug for k in cluster_indices]
        if len(set(source_slugs)) >= 2:
            scores = {articles[k].id: float(sim_matrix[i][k]) for k in cluster_indices}
            # Pick title from the article with most words (usually more complete)
            rep_idx = max(cluster_indices, key=lambda k: len(articles[k].title.split()))
            clusters.append(Cluster(
                article_ids=[articles[k].id for k in cluster_indices],
                source_slugs=source_slugs,
                representative_title=articles[rep_idx].title,
                similarity_scores=scores,
            ))

    logger.info(f"Clustered {len(articles)} articles into {len(clusters)} clusters")
    return clusters
