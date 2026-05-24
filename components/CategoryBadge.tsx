import { getCategoryColor } from '@/lib/utils'

export default function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getCategoryColor(category)}`}>
      {category}
    </span>
  )
}
