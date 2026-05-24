import { NextResponse } from 'next/server'
import { runPipeline } from '@/lib/pipeline'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST() {
  try {
    await runPipeline()
    return NextResponse.json({ status: 'ok', message: 'Scraping completado' })
  } catch (err) {
    console.error('Pipeline error:', err)
    return NextResponse.json({ error: 'Pipeline failed', detail: String(err) }, { status: 500 })
  }
}
