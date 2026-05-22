import asyncio
import logging
import time
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Source, RawArticle, NewsCluster, ClusterArticle, ClusterComment
from app.api.schemas import (
    SourceSchema, NewsClusterListSchema, NewsClusterDetailSchema,
    ClusterArticleSchema, ClusterCommentSchema, StatsSchema, ScrapeResponseSchema,
    TweetSchema,
)
from app.pipeline import run_scraping_pipeline

# Simple in-memory cache: cluster_id -> (timestamp, list[TweetSchema])
_tweet_cache: dict = {}
_TWEET_TTL = 300  # 5 minutes

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/sources", response_model=List[SourceSchema])
async def list_sources(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Source).where(Source.active == True).order_by(Source.name))
    return result.scalars().all()


@router.get("/news", response_model=List[NewsClusterListSchema])
async def list_news(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(NewsCluster)
        .options(
            selectinload(NewsCluster.articles)
            .selectinload(ClusterArticle.article)
            .selectinload(RawArticle.source)
        )
        .order_by(desc(NewsCluster.published_at))
    )
    if category:
        query = query.where(NewsCluster.category == category)

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    clusters = result.scalars().all()

    out = []
    for cluster in clusters:
        sources = list({ca.article.source.slug for ca in cluster.articles})
        out.append(NewsClusterListSchema(
            id=cluster.id,
            title=cluster.title,
            synthesis=cluster.synthesis[:200] + "..." if cluster.synthesis and len(cluster.synthesis) > 200 else cluster.synthesis,
            category=cluster.category,
            source_count=cluster.source_count,
            published_at=cluster.published_at,
            sources=sources,
            image_url=cluster.image_url,
        ))
    return out


@router.get("/news/{cluster_id}", response_model=NewsClusterDetailSchema)
async def get_news_detail(cluster_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(NewsCluster)
        .options(
            selectinload(NewsCluster.articles)
            .selectinload(ClusterArticle.article)
            .selectinload(RawArticle.source),
            selectinload(NewsCluster.comments),
        )
        .where(NewsCluster.id == cluster_id)
    )
    cluster = result.scalar_one_or_none()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")

    articles = []
    for ca in cluster.articles:
        art = ca.article
        src = art.source
        articles.append(ClusterArticleSchema(
            source_slug=src.slug,
            source_name=src.name,
            source_color=src.color,
            article_title=art.title,
            article_url=art.url,
            coverage_percentage=ca.coverage_percentage,
            emphasis=ca.emphasis,
            omissions=ca.omissions,
            similarity_score=ca.similarity_score,
        ))

    return NewsClusterDetailSchema(
        id=cluster.id,
        title=cluster.title,
        synthesis=cluster.synthesis,
        key_facts=cluster.key_facts,
        category=cluster.category,
        source_count=cluster.source_count,
        published_at=cluster.published_at,
        articles=articles,
        image_url=cluster.image_url,
        comments=[ClusterCommentSchema.model_validate(c) for c in cluster.comments],
    )


@router.get("/stats", response_model=StatsSchema)
async def get_stats(db: AsyncSession = Depends(get_db)):
    total_clusters = await db.scalar(select(func.count(NewsCluster.id)))
    total_articles = await db.scalar(select(func.count(RawArticle.id)))
    sources_active = await db.scalar(select(func.count(Source.id)).where(Source.active == True))
    last_article = await db.scalar(select(func.max(RawArticle.scraped_at)))

    return StatsSchema(
        total_clusters=total_clusters or 0,
        total_articles=total_articles or 0,
        sources_active=sources_active or 0,
        last_scrape=last_article,
    )


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(NewsCluster.category, func.count(NewsCluster.id).label("count"))
        .where(NewsCluster.category.isnot(None))
        .group_by(NewsCluster.category)
        .order_by(desc("count"))
    )
    return [{"category": row.category, "count": row.count} for row in result.all()]


@router.get("/news/{cluster_id}/tweets", response_model=List[TweetSchema])
async def get_cluster_tweets(cluster_id: int, db: AsyncSession = Depends(get_db)):
    from app.scrapers.twitter import get_tweets_for_cluster

    cached = _tweet_cache.get(cluster_id)
    if cached and time.time() - cached[0] < _TWEET_TTL:
        return cached[1]

    result = await db.execute(select(NewsCluster).where(NewsCluster.id == cluster_id))
    cluster = result.scalar_one_or_none()
    if not cluster:
        raise HTTPException(status_code=404, detail="Not found")

    tweets = await get_tweets_for_cluster(cluster.title, cluster.key_facts or [])
    schemas = [
        TweetSchema(
            username=t.username,
            display_name=t.display_name,
            text=t.text,
            tweet_url=t.tweet_url,
            published_at=t.published_at,
        )
        for t in tweets
    ]
    _tweet_cache[cluster_id] = (time.time(), schemas)
    return schemas


@router.post("/scrape", response_model=ScrapeResponseSchema)
async def trigger_scrape(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_scraping_pipeline)
    return ScrapeResponseSchema(status="ok", message="Scraping iniciado en background")
