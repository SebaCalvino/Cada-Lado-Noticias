/* CADA LADO — frontend API client.
 * Works both client-side (relative URLs) and server-side (absolute URLs on Vercel).
 */

import axios from 'axios'
import type { Source, NewsCluster, NewsClusterDetail, Stats, Category, Tweet } from '@/types'

function resolveBaseUrl(): string {
  // Browser: same-origin
  if (typeof window !== 'undefined') return ''
  // Explicit override (rare — only if you point to another deployment)
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  // Vercel deploy: auto-injected
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  // Local dev
  return `http://localhost:${process.env.PORT ?? 3000}`
}

const api = axios.create({
  baseURL: `${resolveBaseUrl()}/api`,
  timeout: 15_000,
})

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

export const getTweets = (clusterId: number) =>
  api.get<Tweet[]>(`/news/${clusterId}/tweets`).then(r => r.data)

export const triggerScrape = () =>
  api.post('/scrape').then(r => r.data)

export const getTrendingTopics = () =>
  api.get<{ topic: string; count: number; category: boolean }[]>('/trending-topics').then(r => r.data)
