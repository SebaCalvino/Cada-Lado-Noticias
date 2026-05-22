from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Float,
    ForeignKey, Boolean, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base


class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True)
    slug = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    url = Column(String(255), nullable=False)
    rss_url = Column(String(255))
    logo_url = Column(String(255))
    color = Column(String(20), default="#666666")
    ideology_score = Column(Float, default=0.0)  # -1 izquierda, 0 centro, +1 derecha
    ideology_label = Column(String(50))
    active = Column(Boolean, default=True)
    articles = relationship("RawArticle", back_populates="source")


class RawArticle(Base):
    __tablename__ = "raw_articles"

    id = Column(Integer, primary_key=True)
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=False)
    title = Column(String(500), nullable=False)
    url = Column(String(1000), unique=True, nullable=False)
    summary = Column(Text)
    content = Column(Text)
    published_at = Column(DateTime)
    scraped_at = Column(DateTime, default=datetime.utcnow)
    category = Column(String(100))
    clustered = Column(Boolean, default=False)

    source = relationship("Source", back_populates="articles")
    cluster_memberships = relationship("ClusterArticle", back_populates="article")


class NewsCluster(Base):
    __tablename__ = "news_clusters"

    id = Column(Integer, primary_key=True)
    title = Column(String(500), nullable=False)
    synthesis = Column(Text)
    key_facts = Column(JSON)
    category = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    published_at = Column(DateTime)
    source_count = Column(Integer, default=0)
    featured = Column(Boolean, default=False)

    articles = relationship("ClusterArticle", back_populates="cluster")


class ClusterArticle(Base):
    __tablename__ = "cluster_articles"
    __table_args__ = (UniqueConstraint("cluster_id", "article_id"),)

    id = Column(Integer, primary_key=True)
    cluster_id = Column(Integer, ForeignKey("news_clusters.id"), nullable=False)
    article_id = Column(Integer, ForeignKey("raw_articles.id"), nullable=False)
    coverage_percentage = Column(Float, default=0.0)
    emphasis = Column(Text)
    omissions = Column(Text)
    similarity_score = Column(Float, default=0.0)

    cluster = relationship("NewsCluster", back_populates="articles")
    article = relationship("RawArticle", back_populates="cluster_memberships")
