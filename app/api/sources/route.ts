import { NextResponse } from 'next/server'
import { db, sources } from '@/lib/db'
import { eq, asc } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(sources)
      .where(eq(sources.active, true))
      .orderBy(asc(sources.name))

    return NextResponse.json(
      rows.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        url: s.url,
        color: s.color,
        ideology_score: s.ideologyScore,
        ideology_label: s.ideologyLabel ?? null,
      }))
    )
  } catch (err) {
    console.error('/api/sources error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
