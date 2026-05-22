from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class SourceSchema(BaseModel):
    id: int
    slug: str
    name: str
    url: str
    color: str
    ideology_score: float
    ideology_label: Optional[str]

    class Config:
        from_attributes = True


class ClusterArticleSchema(BaseModel):
    source_slug: str
    source_name: str
    source_color: str
    article_title: str
    article_url: str
    article_image_url: Optional[str] = None
    coverage_percentage: float
    emphasis: Optional[str]
    omissions: Optional[str]
    similarity_score: float

    class Config:
        from_attributes = True


class ClusterCommentSchema(BaseModel):
    id: int
    author: Optional[str]
    text: str
    sentiment: Optional[str]
    votes: int
    source_slug: str

    class Config:
        from_attributes = True


class NewsClusterListSchema(BaseModel):
    id: int
    title: str
    synthesis: Optional[str]
    category: Optional[str]
    source_count: int
    published_at: Optional[datetime]
    sources: List[str]  # list of source slugs
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


class NewsClusterDetailSchema(BaseModel):
    id: int
    title: str
    synthesis: Optional[str]
    key_facts: Optional[List[str]]
    category: Optional[str]
    source_count: int
    published_at: Optional[datetime]
    articles: List[ClusterArticleSchema]
    image_url: Optional[str] = None
    comments: List[ClusterCommentSchema] = []

    class Config:
        from_attributes = True


class StatsSchema(BaseModel):
    total_clusters: int
    total_articles: int
    sources_active: int
    last_scrape: Optional[datetime]


class ScrapeResponseSchema(BaseModel):
    status: str
    message: str


class TweetSchema(BaseModel):
    username: str
    display_name: str
    text: str
    tweet_url: str
    published_at: datetime
