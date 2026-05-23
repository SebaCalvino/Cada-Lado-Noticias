import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sources } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await db.select().from(sources).where(eq(sources.active, true)).orderBy(asc(sources.name))
    return NextResponse.json(rows.map(s => ({
      id:             s.id,
      slug:           s.slug,
      name:           s.name,
      url:            s.url,
      color:          s.color,
      ideology_score: s.ideologyScore,
      ideology_label: s.ideologyLabel,
    })))
  } catch (e) {
    console.error('GET /api/sources failed:', e)
    return NextResponse.json([], { status: 200 })
  }
}
