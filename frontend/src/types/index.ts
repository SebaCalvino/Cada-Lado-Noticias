export interface Source {
  id: number
  slug: string
  name: string
  url: string
  color: string
  ideology_score: number
  ideology_label: string | null
}

export interface ClusterArticle {
  source_slug: string
  source_name: string
  source_color: string
  article_title: string
  article_url: string
  coverage_percentage: number
  emphasis: string | null
  omissions: string | null
  similarity_score: number
}

export interface NewsCluster {
  id: number
  title: string
  synthesis: string | null
  category: string | null
  source_count: number
  published_at: string | null
  sources: string[]
}

export interface NewsClusterDetail {
  id: number
  title: string
  synthesis: string | null
  key_facts: string[] | null
  category: string | null
  source_count: number
  published_at: string | null
  articles: ClusterArticle[]
}

export interface Stats {
  total_clusters: number
  total_articles: number
  sources_active: number
  last_scrape: string | null
}

export interface Category {
  category: string
  count: number
}
