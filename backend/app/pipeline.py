import asyncio
import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models import Source, RawArticle, NewsCluster, ClusterArticle
from app.scrapers import ALL_SCRAPERS
from app.clustering import ArticleInput, cluster_articles
from app.ai_synthesis import ArticleForSynthesis, synthesize_cluster

logger = logging.getLogger(__name__)

SOURCES_METADATA = {
    "clarin": {"name": "Clarín", "url": "https://www.clarin.com", "color": "#004B87", "ideology_score": 0.3, "ideology_label": "Centro-derecha"},
    "lanacion": {"name": "La Nación", "url": "https://www.lanacion.com.ar", "color": "#1A3A5C", "ideology_score": 0.6, "ideology_label": "Centro-derecha"},
    "infobae": {"name": "Infobae", "url": "https://www.infobae.com", "color": "#E30613", "ideology_score": 0.2, "ideology_label": "Centro"},
    "pagina12": {"name": "Página 12", "url": "https://www.pagina12.com.ar", "color": "#1A1A1A", "ideology_score": -0.7, "ideology_label": "Izquierda"},
    "ambito": {"name": "Ámbito", "url": "https://www.ambito.com", "color": "#FF6B00", "ideology_score": 0.1, "ideology_label": "Centro"},
    "cronista": {"name": "El Cronista", "url": "https://www.cronista.com", "color": "#2C7BB6", "ideology_score": 0.2, "ideology_label": "Centro"},
    "perfil": {"name": "Perfil", "url": "https://www.perfil.com", "color": "#8B0000", "ideology_score": -0.1, "ideology_label": "Centro"},
    "laizquierda": {"name": "La Izquierda Diario", "url": "https://www.laizquierdadiario.com", "color": "#CC0000", "ideology_score": -1.0, "ideology_label": "Izquierda"},
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

        all_new_articles = []
        scrape_tasks = [scraper.get_articles() for scraper in ALL_SCRAPERS]
        results = await asyncio.gather(*scrape_tasks, return_exceptions=True)

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
                )
                db.add(article)
                all_new_articles.append((article, source.slug, source.name))

        await db.commit()
        logger.info(f"Scraped {len(all_new_articles)} new articles")

        # Refresh articles with IDs
        await db.flush()
        for art, *_ in all_new_articles:
            await db.refresh(art)

        if len(all_new_articles) < 2:
            logger.info("Not enough articles to cluster")
            return

        # Cluster
        inputs = [
            ArticleInput(
                id=art.id,
                title=art.title,
                summary=art.summary or "",
                source_slug=slug,
            )
            for art, slug, _ in all_new_articles
        ]

        clusters = cluster_articles(inputs)
        logger.info(f"Found {len(clusters)} clusters")

        slug_to_name = {slug: name for _, slug, name in all_new_articles}
        id_to_data = {art.id: (art, slug, name) for art, slug, name in all_new_articles}

        for cluster in clusters:
            arts_for_synthesis = []
            for art_id in cluster.article_ids:
                if art_id not in id_to_data:
                    continue
                art, slug, name = id_to_data[art_id]
                arts_for_synthesis.append(ArticleForSynthesis(
                    source_name=slug_to_name.get(slug, slug),
                    source_slug=slug,
                    title=art.title,
                    summary=art.summary or "",
                    url=art.url,
                ))

            synthesis = await synthesize_cluster(arts_for_synthesis)
            if not synthesis:
                continue

            news_cluster = NewsCluster(
                title=synthesis.title,
                synthesis=synthesis.synthesis,
                key_facts=synthesis.key_facts,
                category=synthesis.category,
                published_at=datetime.utcnow(),
                source_count=len(set(cluster.source_slugs)),
            )
            db.add(news_cluster)
            await db.flush()
            await db.refresh(news_cluster)

            sa_by_slug = {sa.source_slug: sa for sa in synthesis.source_analyses}

            for art_id in cluster.article_ids:
                if art_id not in id_to_data:
                    continue
                art, slug, _ = id_to_data[art_id]
                sa = sa_by_slug.get(slug)

                ca = ClusterArticle(
                    cluster_id=news_cluster.id,
                    article_id=art.id,
                    coverage_percentage=sa.coverage_percentage if sa else 0.0,
                    emphasis=sa.emphasis if sa else "",
                    omissions=sa.omissions if sa else "",
                    similarity_score=cluster.similarity_scores.get(art_id, 0.0),
                )
                db.add(ca)
                art.clustered = True

        await db.commit()
        logger.info("Pipeline complete")
