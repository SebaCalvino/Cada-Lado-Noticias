/* CADA LADO — Drizzle schema mirroring the previous SQLAlchemy models */

import {
  pgTable, serial, varchar, text, timestamp, integer, real, boolean,
  jsonb, uniqueIndex, index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

/* ── Sources ─────────────────────────────────────────────────────── */
export const sources = pgTable('sources', {
  id:             serial('id').primaryKey(),
  slug:           varchar('slug', { length: 50 }).notNull().unique(),
  name:           varchar('name', { length: 100 }).notNull(),
  url:            varchar('url', { length: 255 }).notNull(),
  rssUrl:         varchar('rss_url', { length: 255 }),
  logoUrl:        varchar('logo_url', { length: 255 }),
  color:          varchar('color', { length: 20 }).default('#666666'),
  ideologyScore:  real('ideology_score').default(0),
  ideologyLabel:  varchar('ideology_label', { length: 50 }),
  active:         boolean('active').default(true),
})

/* ── Raw articles ────────────────────────────────────────────────── */
export const rawArticles = pgTable('raw_articles', {
  id:           serial('id').primaryKey(),
  sourceId:     integer('source_id').notNull().references(() => sources.id),
  title:        varchar('title', { length: 500 }).notNull(),
  url:          varchar('url', { length: 1000 }).notNull().unique(),
  summary:      text('summary'),
  content:      text('content'),
  publishedAt:  timestamp('published_at'),
  scrapedAt:    timestamp('scraped_at').defaultNow(),
  category:     varchar('category', { length: 100 }),
  imageUrl:     text('image_url'),
  clustered:    boolean('clustered').default(false),
}, (t) => ({
  scrapedAtIdx:  index('raw_articles_scraped_at_idx').on(t.scrapedAt),
  clusteredIdx:  index('raw_articles_clustered_idx').on(t.clustered),
}))

/* ── News clusters ───────────────────────────────────────────────── */
export const newsClusters = pgTable('news_clusters', {
  id:             serial('id').primaryKey(),
  title:          varchar('title', { length: 500 }).notNull(),
  synthesis:      text('synthesis'),
  keyFacts:       jsonb('key_facts').$type<string[]>(),
  category:       varchar('category', { length: 100 }),
  createdAt:      timestamp('created_at').defaultNow(),
  publishedAt:    timestamp('published_at'),
  sourceCount:    integer('source_count').default(0),
  imageUrl:       text('image_url'),
  featured:       boolean('featured').default(false),
}, (t) => ({
  publishedAtIdx: index('news_clusters_published_at_idx').on(t.publishedAt),
}))

/* ── Cluster ↔ Article (many-to-many with per-source analysis) ───── */
export const clusterArticles = pgTable('cluster_articles', {
  id:                  serial('id').primaryKey(),
  clusterId:           integer('cluster_id').notNull().references(() => newsClusters.id, { onDelete: 'cascade' }),
  articleId:           integer('article_id').notNull().references(() => rawArticles.id),
  coveragePercentage:  real('coverage_percentage').default(0),
  emphasis:            text('emphasis'),
  omissions:           text('omissions'),
  similarityScore:     real('similarity_score').default(0),
}, (t) => ({
  uniqClusterArticle:  uniqueIndex('cluster_article_uniq').on(t.clusterId, t.articleId),
}))

/* ── Cluster comments ─────────────────────────────────────────────── */
export const clusterComments = pgTable('cluster_comments', {
  id:          serial('id').primaryKey(),
  clusterId:   integer('cluster_id').notNull().references(() => newsClusters.id, { onDelete: 'cascade' }),
  sourceSlug:  varchar('source_slug', { length: 50 }).default('lanacion'),
  author:      varchar('author', { length: 200 }),
  text:        text('text').notNull(),
  sentiment:   varchar('sentiment', { length: 20 }),
  votes:       integer('votes').default(0),
  scrapedAt:   timestamp('scraped_at').defaultNow(),
})

/* ── Relations ───────────────────────────────────────────────────── */
export const sourcesRelations = relations(sources, ({ many }) => ({
  articles: many(rawArticles),
}))

export const rawArticlesRelations = relations(rawArticles, ({ one, many }) => ({
  source:           one(sources, { fields: [rawArticles.sourceId], references: [sources.id] }),
  clusterMemberships: many(clusterArticles),
}))

export const newsClustersRelations = relations(newsClusters, ({ many }) => ({
  articles: many(clusterArticles),
  comments: many(clusterComments),
}))

export const clusterArticlesRelations = relations(clusterArticles, ({ one }) => ({
  cluster: one(newsClusters, { fields: [clusterArticles.clusterId], references: [newsClusters.id] }),
  article: one(rawArticles,  { fields: [clusterArticles.articleId], references: [rawArticles.id] }),
}))

export const clusterCommentsRelations = relations(clusterComments, ({ one }) => ({
  cluster: one(newsClusters, { fields: [clusterComments.clusterId], references: [newsClusters.id] }),
}))

/* ── Type exports ────────────────────────────────────────────────── */
export type Source         = typeof sources.$inferSelect
export type NewSource      = typeof sources.$inferInsert
export type RawArticle     = typeof rawArticles.$inferSelect
export type NewRawArticle  = typeof rawArticles.$inferInsert
export type NewsCluster    = typeof newsClusters.$inferSelect
export type NewNewsCluster = typeof newsClusters.$inferInsert
export type ClusterArticle = typeof clusterArticles.$inferSelect
export type ClusterComment = typeof clusterComments.$inferSelect
