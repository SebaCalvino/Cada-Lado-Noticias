import asyncio
import logging
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import AsyncSessionLocal
from app.models import Source, RawArticle, NewsCluster, ClusterArticle, ClusterComment
from app.scrapers import ALL_SCRAPERS
from app.clustering import ArticleInput, cluster_articles
from app.ai_synthesis import ArticleForSynthesis, synthesize_cluster, classify_comments
from app.scrapers.comments import get_lanacion_comments

logger = logging.getLogger(__name__)

SOURCES_METADATA = {
    "clarin":     {"name": "Clarín",      "url": "https://www.clarin.com",         "color": "#004B87", "ideology_score":  0.3, "ideology_label": "Centro-derecha"},
    "lanacion":   {"name": "La Nación",   "url": "https://www.lanacion.com.ar",    "color": "#1A3A5C", "ideology_score":  0.6, "ideology_label": "Centro-derecha"},
    "infobae":    {"name": "Infobae",     "url": "https://www.infobae.com",        "color": "#E30613", "ideology_score":  0.2, "ideology_label": "Centro"},
    "pagina12":   {"name": "Página 12",   "url": "https://www.pagina12.com.ar",   "color": "#1A1A1A", "ideology_score": -0.7, "ideology_label": "Izquierda"},
    "ambito":     {"name": "Ámbito",      "url": "https://www.ambito.com",         "color": "#FF6B00", "ideology_score":  0.1, "ideology_label": "Centro"},
    "cronista":   {"name": "El Cronista", "url": "https://www.cronista.com",       "color": "#2C7BB6", "ideology_score":  0.2, "ideology_label": "Centro"},
    "perfil":     {"name": "Perfil",      "url": "https://www.perfil.com",         "color": "#8B0000", "ideology_score": -0.1, "ideology_label": "Centro"},
    "laizquierda":{"name": "La Izquierda Diario", "url": "https://www.laizquierdadiario.com", "color": "#CC0000", "ideology_score": -0.8, "ideology_label": "Izquierda"},
}


async def ensure_sources(db: AsyncSession):
    for slug, meta in SOURCES_METADATA.items():
        result = await db.execute(select(Source).where(Source.slug == slug))
        source = result.scalar_one_or_none()
        if not source:
            source = Source(slug=slug, **meta)
            db.add(source)
    await db.commit()


async def run_scraping_pipeline():
    logger.info("Starting scraping pipeline...")
    async with AsyncSessionLocal() as db:
        await ensure_sources(db)

        result = await db.execute(select(Source).where(Source.active == True))
        sources = {s.slug: s for s in result.scalars().all()}

        # --- Scrape new articles ---
        scrape_tasks = [scraper.get_articles() for scraper in ALL_SCRAPERS]
        results = await asyncio.gather(*scrape_tasks, return_exceptions=True)

        new_count = 0
        for scraper, articles in zip(ALL_SCRAPERS, results):
            if isinstance(articles, Exception):
                logger.error(f"[{scraper.source_slug}] Scraper failed: {articles}")
                continue
            source = sources.get(scraper.source_slug)
            if not source:
                continue
            for art_data in articles:
                existing = await db.execute(
                    select(RawArticle).where(RawArticle.url == art_data.url)
                )
                if existing.scalar_one_or_none():
                    continue
                article = RawArticle(
                    source_id=source.id,
                    title=art_data.title,
                    url=art_data.url,
                    summary=art_data.summary,
                    published_at=art_data.published_at or datetime.utcnow(),
                    scraped_at=datetime.utcnow(),
                    image_url=art_data.image_url or None,
                )
                db.add(article)
                new_count += 1

        await db.commit()
        logger.info(f"Scraped {new_count} new articles")

        # --- Cluster ALL unclustered articles from the last 24h ---
        cutoff = datetime.utcnow() - timedelta(hours=24)
        recent_result = await db.execute(
            select(RawArticle)
            .options(selectinload(RawArticle.source))
            .where(RawArticle.scraped_at >= cutoff)
            .where(RawArticle.clustered == False)
        )
        recent_articles = recent_result.scalars().all()
        logger.info(f"Unclustered articles in last 24h: {len(recent_articles)}")

        if len(recent_articles) < 2:
            logger.info("Not enough unclustered articles to cluster")
            return

        id_to_article = {a.id: a for a in recent_articles}
        id_to_slug = {a.id: a.source.slug for a in recent_articles}
        id_to_name = {a.id: a.source.name for a in recent_articles}

        inputs = [
            ArticleInput(
                id=a.id,
                title=a.title,
                summary=a.summary or "",
                source_slug=a.source.slug,
            )
            for a in recent_articles
        ]

        clusters = cluster_articles(inputs)
        logger.info(f"Found {len(clusters)} clusters from {len(recent_articles)} articles")

        for cluster in clusters:
            arts_for_synthesis = [
                ArticleForSynthesis(
                    source_name=id_to_name[aid],
                    source_slug=id_to_slug[aid],
                    title=id_to_article[aid].title,
                    summary=id_to_article[aid].summary or "",
                    url=id_to_article[aid].url,
                )
                for aid in cluster.article_ids
                if aid in id_to_article
            ]

            synthesis = await synthesize_cluster(arts_for_synthesis)
            if not synthesis:
                continue

            image_url = next((id_to_article[aid].image_url for aid in cluster.article_ids if aid in id_to_article and id_to_article[aid].image_url), None)

            news_cluster = NewsCluster(
                title=synthesis.title,
                synthesis=synthesis.synthesis,
                key_facts=synthesis.key_facts,
                category=synthesis.category,
                published_at=datetime.utcnow(),
                source_count=len(set(cluster.source_slugs)),
                image_url=image_url,
            )
            db.add(news_cluster)
            await db.flush()
            await db.refresh(news_cluster)

            sa_by_slug = {sa.source_slug: sa for sa in synthesis.source_analyses}

            for art_id in cluster.article_ids:
                if art_id not in id_to_article:
                    continue
                art = id_to_article[art_id]
                slug = id_to_slug[art_id]
                sa = sa_by_slug.get(slug)

                db.add(ClusterArticle(
                    cluster_id=news_cluster.id,
                    article_id=art.id,
                    coverage_percentage=sa.coverage_percentage if sa else 0.0,
                    emphasis=sa.emphasis if sa else "",
                    omissions=sa.omissions if sa else "",
                    similarity_score=cluster.similarity_scores.get(art_id, 0.0),
                ))
                art.clustered = True

            # Scrape comments for this cluster from La Nación articles
            lanacion_articles = [id_to_article[aid] for aid in cluster.article_ids
                                 if aid in id_to_article and id_to_slug[aid] == "lanacion"]
            if lanacion_articles:
                all_comments = []
                for art in lanacion_articles[:2]:  # max 2 articles
                    comments = await get_lanacion_comments(art.url)
                    all_comments.extend(comments)

                if all_comments:
                    texts = [c.text for c in all_comments]
                    classification = await classify_comments(texts)

                    saved = set()
                    for sentiment, indices in [("positive", classification.get("positive", [])),
                                               ("negative", classification.get("negative", []))]:
                        for idx in indices[:3]:
                            idx = int(idx) - 1
                            if 0 <= idx < len(all_comments) and idx not in saved:
                                saved.add(idx)
                                c = all_comments[idx]
                                db.add(ClusterComment(
                                    cluster_id=news_cluster.id,
                                    source_slug="lanacion",
                                    author=c.author,
                                    text=c.text,
                                    sentiment=sentiment,
                                    votes=c.votes,
                                ))

        await db.commit()

        # Re-synthesize clusters that previously failed (synthesis is null)
        failed_result = await db.execute(
            select(NewsCluster)
            .options(
                selectinload(NewsCluster.articles)
                .selectinload(ClusterArticle.article)
                .selectinload(RawArticle.source)
            )
            .where(NewsCluster.synthesis == None)
        )
        failed_clusters = failed_result.scalars().all()
        if failed_clusters:
            logger.info(f"Re-synthesizing {len(failed_clusters)} clusters without synthesis")
            for nc in failed_clusters:
                arts_for_synthesis = [
                    ArticleForSynthesis(
                        source_name=ca.article.source.name,
                        source_slug=ca.article.source.slug,
                        title=ca.article.title,
                        summary=ca.article.summary or "",
                        url=ca.article.url,
                    )
                    for ca in nc.articles
                ]
                if len(arts_for_synthesis) < 2:
                    continue
                synthesis = await synthesize_cluster(arts_for_synthesis)
                if synthesis:
                    nc.title = synthesis.title
                    nc.synthesis = synthesis.synthesis
                    nc.key_facts = synthesis.key_facts
                    nc.category = synthesis.category
                    sa_by_slug = {sa.source_slug: sa for sa in synthesis.source_analyses}
                    for ca in nc.articles:
                        sa = sa_by_slug.get(ca.article.source.slug)
                        if sa:
                            ca.coverage_percentage = sa.coverage_percentage
                            ca.emphasis = sa.emphasis
                            ca.omissions = sa.omissions
            await db.commit()

        logger.info("Pipeline complete")
