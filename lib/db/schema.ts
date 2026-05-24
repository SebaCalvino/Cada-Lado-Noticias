import {
  pgTable,
  serial,
  varchar,
  text,
  real,
  boolean,
  integer,
  timestamp,
  json,
  uniqueIndex,
  foreignKey,
} from 'drizzle-orm/pg-core'

export const sources = pgTable('sources', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  url: varchar('url', { length: 255 }).notNull(),
  color: varchar('color', { length: 20 }).default('#666666').notNull(),
  ideologyScore: real('ideology_score').default(0.0).notNull(),
  ideologyLabel: varchar('ideology_label', { length: 50 }),
  active: boolean('active').default(true).notNull(),
})

export const rawArticles = pgTable('raw_articles', {
  id: serial('id').primaryKey(),
  sourceId: integer('source_id').notNull().references(() => sources.id),
  title: varchar('title', { length: 500 }).notNull(),
  url: varchar('url', { length: 1000 }).notNull().unique(),
  summary: text('summary'),
  publishedAt: timestamp('published_at'),
  scrapedAt: timestamp('scraped_at').defaultNow().notNull(),
  imageUrl: text('image_url'),
  clustered: boolean('clustered').default(false).notNull(),
})

export const newsClusters = pgTable('news_clusters', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  synthesis: text('synthesis'),
  keyFacts: json('key_facts').$type<string[]>(),
  category: varchar('category', { length: 100 }),
  publishedAt: timestamp('published_at'),
  sourceCount: integer('source_count').default(0).notNull(),
  imageUrl: text('image_url'),
})

export const clusterArticles = pgTable(
  'cluster_articles',
  {
    id: serial('id').primaryKey(),
    clusterId: integer('cluster_id').notNull().references(() => newsClusters.id),
    articleId: integer('article_id').notNull().references(() => rawArticles.id),
    coveragePercentage: real('coverage_percentage').default(0.0).notNull(),
    emphasis: text('emphasis'),
    omissions: text('omissions'),
    similarityScore: real('similarity_score').default(0.0).notNull(),
  },
  (t) => ({
    uniq: uniqueIndex('ca_cluster_article_uniq').on(t.clusterId, t.articleId),
  })
)

export const clusterComments = pgTable('cluster_comments', {
  id: serial('id').primaryKey(),
  clusterId: integer('cluster_id').notNull().references(() => newsClusters.id),
  sourceSlug: varchar('source_slug', { length: 50 }).default('lanacion').notNull(),
  author: varchar('author', { length: 200 }),
  text: text('text').notNull(),
  sentiment: varchar('sentiment', { length: 20 }),
  votes: integer('votes').default(0).notNull(),
  scrapedAt: timestamp('scraped_at').defaultNow().notNull(),
})

export type Source = typeof sources.$inferSelect
export type RawArticle = typeof rawArticles.$inferSelect
export type NewsCluster = typeof newsClusters.$inferSelect
export type ClusterArticle = typeof clusterArticles.$inferSelect
export type ClusterComment = typeof clusterComments.$inferSelect
