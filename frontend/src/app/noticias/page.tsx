import { getNews, getCategories } from '@/lib/api'
import NewsCard from '@/components/NewsCard'
import TrendingTopics from '@/components/TrendingTopics'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: { category?: string; page?: string }
}

const CATEGORY_COLOR: Record<string, string> = {
  'Política':      '#1e40af',
  'Economía':      '#065f46',
  'Sociedad':      '#6d28d9',
  'Seguridad':     '#991b1b',
  'Internacional': '#3730a3',
  'Deportes':      '#92400e',
  'Cultura':       '#9d174d',
  'Tecnología':    '#164e63',
  'Ambiente':      '#134e4a',
}

function formatDate(date: Date): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ]
  return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
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
  const today = formatDate(new Date())

  return (
    <div>
      <TrendingTopics />
    <div className="max-w-6xl mx-auto px-4 pt-8 pb-16">

      {/* Page header */}
      <div className="mb-8 border-b border-gray-200 pb-6">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-medium">{today}</p>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 leading-tight">
          {category ? category : 'Últimas noticias'}
        </h1>
        {!category && (
          <p className="text-gray-500 mt-2 text-sm">
            Todas las coberturas del día, analizadas desde todos los ángulos.
          </p>
        )}
      </div>

      {/* Category filters — bottom-border style */}
      <div className="flex flex-wrap gap-1 mb-8 border-b border-gray-200">
        <Link
          href="/noticias"
          className={`px-4 py-2.5 text-sm transition-colors relative -mb-px ${
            !category
              ? 'text-gray-900 font-bold border-b-[3px] border-gray-900'
              : 'font-medium text-gray-500 hover:text-gray-900 border-b-2 border-transparent'
          }`}
        >
          Todas
        </Link>
        {categories.map(cat => {
          const active = category === cat.category
          const color = CATEGORY_COLOR[cat.category] ?? '#374151'
          return (
            <Link
              key={cat.category}
              href={`/noticias?category=${encodeURIComponent(cat.category)}`}
              className={`px-4 py-2.5 text-sm transition-colors relative -mb-px border-b-[3px] ${
                active ? 'font-bold' : 'font-medium text-gray-500 hover:text-gray-800 border-transparent'
              }`}
              style={active ? { borderBottomColor: color, color } : undefined}
            >
              {cat.category}
              <span className="ml-1.5 text-xs opacity-60">{cat.count}</span>
            </Link>
          )
        })}
      </div>

      {clusters.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
          <p className="text-gray-500 text-lg font-serif">No hay noticias disponibles todavía.</p>
          <p className="text-gray-400 text-sm mt-2">
            El sistema actualiza automáticamente 3 veces por día.
          </p>
        </div>
      ) : (
        <>
          <div>
            {Array.from({ length: Math.ceil(clusters.length / 3) }, (_, groupIdx) => {
              const group = clusters.slice(groupIdx * 3, groupIdx * 3 + 3)
              return (
                <div key={groupIdx}>
                  {groupIdx > 0 && (
                    <div className="flex items-center gap-4 my-8">
                      <hr className="flex-1 border-gray-200" />
                      <span className="text-xs text-gray-300 font-medium uppercase tracking-widest shrink-0">· · ·</span>
                      <hr className="flex-1 border-gray-200" />
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {group.map(cluster => (
                      <NewsCard key={cluster.id} cluster={cluster} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 mt-12">
            {page > 1 && (
              <Link
                href={`/noticias?page=${page - 1}${category ? `&category=${encodeURIComponent(category)}` : ''}`}
                className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-500 hover:text-gray-900 transition-colors"
              >
                ← Anterior
              </Link>
            )}
            {clusters.length === 20 && (
              <Link
                href={`/noticias?page=${page + 1}${category ? `&category=${encodeURIComponent(category)}` : ''}`}
                className="px-6 py-3 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors shadow-sm"
              >
                Cargar más noticias →
              </Link>
            )}
          </div>
        </>
      )}
    </div>
    </div>
  )
}
