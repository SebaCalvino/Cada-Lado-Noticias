import axios from 'axios'
import type { Source, NewsCluster, NewsClusterDetail, Stats, Category } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: `${API_URL}/api` })

export const getSources = () =>
  api.get<Source[]>('/sources').then(r => r.data)

export const getNews = (page = 1, category?: string) =>
  api.get<NewsCluster[]>('/news', { params: { page, page_size: 20, category } }).then(r => r.data)

export const getNewsDetail = (id: number) =>
  api.get<NewsClusterDetail>(`/news/${id}`).then(r => r.data)

export const getStats = () =>
  api.get<Stats>('/stats').then(r => r.data)

export const getCategories = () =>
  api.get<Category[]>('/categories').then(r => r.data)

export const triggerScrape = () =>
  api.post('/scrape').then(r => r.data)
