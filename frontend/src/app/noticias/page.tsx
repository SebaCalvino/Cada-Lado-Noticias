import { Suspense } from 'react'
import { getNews, getCategories } from '@/lib/api'
import NewsCard from '@/components/NewsCard'
import CategoryBadge from '@/components/CategoryBadge'
import Link from 'next/link'

export const revalidate = 300

interface Props {
  searchParams: { category?: string; page?: string }
}

export default async function NoticiasPage({ searchParams }: Props) {
  const category = searchParams.category
  const page = parseInt(searchParams.page || '1', 10)

  const [newsResult, catsResult] = await Promise.allSettled([
    getNews(page, category),
    getCategories(),
  ])

  const clusters = newsResult.status === 'fulfilled' ? newsResult.value : []
  const categories = catsResult.status === 'fulfilled' ? catsResult.value : []

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-serif font-bold text-gray-900 mb-6">Noticias</h1>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href="/noticias"
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !category ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300'
          }`}
        >
          Todas
        </Link>
        {categories.map(cat => (
          <Link
            key={cat.category}
            href={`/noticias?category=${encodeURIComponent(cat.category)}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === cat.category
                ? 'bg-brand-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300'
            }`}
          >
            {cat.category}
            <span className="ml-1.5 text-xs opacity-70">{cat.count}</span>
          </Link>
        ))}
      </div>

      {clusters.length === 0 ? (
        <div className="card p-16 text-center">
          <p className="text-gray-500 text-lg">No hay noticias disponibles todavía.</p>
          <p className="text-gray-400 text-sm mt-2">
            El sistema actualiza automáticamente 3 veces por día.
          </p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {clusters.map(cluster => (
              <NewsCard key={cluster.id} cluster={cluster} />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 mt-10">
            {page > 1 && (
              <Link
                href={`/noticias?page=${page - 1}${category ? `&category=${category}` : ''}`}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:border-brand-300 transition-colors"
              >
                ← Anterior
              </Link>
            )}
            {clusters.length === 20 && (
              <Link
                href={`/noticias?page=${page + 1}${category ? `&category=${category}` : ''}`}
                className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
              >
                Siguiente →
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  )
}
