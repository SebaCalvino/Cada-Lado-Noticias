import { clsx, type ClassValue } from 'clsx'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: es })
  } catch {
    return ''
  }
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Política':       'bg-blue-100 text-blue-800',
  'Economía':       'bg-green-100 text-green-800',
  'Sociedad':       'bg-purple-100 text-purple-800',
  'Seguridad':      'bg-red-100 text-red-800',
  'Internacional':  'bg-yellow-100 text-yellow-800',
  'Deportes':       'bg-orange-100 text-orange-800',
  'Cultura':        'bg-pink-100 text-pink-800',
  'Tecnología':     'bg-cyan-100 text-cyan-800',
  'Ambiente':       'bg-emerald-100 text-emerald-800',
}

export function getCategoryColor(cat: string | null): string {
  if (!cat) return 'bg-gray-100 text-gray-700'
  return CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-700'
}

/** Convierte un título en un slug URL-friendly en español */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // quita acentos
    .replace(/[^a-z0-9\s-]/g, '')   // solo letras, números, espacios y guiones
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)                    // máx 60 chars para URLs razonables
}

/** Genera el href canónico de una noticia: /noticias/titulo-de-la-noticia-123 */
export function noticiaHref(id: number, title: string): string {
  return `/noticias/${slugify(title)}-${id}`
}
