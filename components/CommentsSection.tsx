'use client'

import { ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react'
import type { ClusterComment } from '@/lib/types'

export default function CommentsSection({ comments }: { comments: ClusterComment[] }) {
  const positive = comments.filter(c => c.sentiment === 'positive')
  const negative = comments.filter(c => c.sentiment === 'negative')

  if (comments.length === 0) return null

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2 mb-5">
        <MessageCircle size={20} className="text-gray-500" />
        <h2 className="font-serif font-bold text-xl text-gray-900">
          Lo que dicen los lectores
        </h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          La Nación
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {positive.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <ThumbsUp size={14} className="text-green-600" />
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                Perspectiva favorable
              </span>
            </div>
            <div className="space-y-3">
              {positive.map(comment => (
                <div key={comment.id} className="bg-green-50 border border-green-100 rounded-xl p-4">
                  <p className="text-sm text-gray-800 leading-relaxed">&ldquo;{comment.text}&rdquo;</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-medium text-gray-500">{comment.author}</span>
                    {comment.votes > 0 && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <ThumbsUp size={10} /> {comment.votes}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {negative.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <ThumbsDown size={14} className="text-red-500" />
              <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                Perspectiva crítica
              </span>
            </div>
            <div className="space-y-3">
              {negative.map(comment => (
                <div key={comment.id} className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-sm text-gray-800 leading-relaxed">&ldquo;{comment.text}&rdquo;</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-medium text-gray-500">{comment.author}</span>
                    {comment.votes > 0 && (
                      <span className="text-xs text-red-500 flex items-center gap-1">
                        <ThumbsUp size={10} /> {comment.votes}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
