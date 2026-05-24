import { NextResponse } from 'next/server'
import { runPipeline } from '@/lib/pipeline'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Pro plan + Fluid Compute permite hasta 800s; 600s es margen cómodo.
export const maxDuration = 600

export async function POST() {
  try {
    await runPipeline()
    return NextResponse.json({ status: 'ok', message: 'Scraping completado' })
  } catch (err) {
    console.error('Pipeline error:', err)
    return NextResponse.json({ error: 'Pipeline failed', detail: String(err) }, { status: 500 })
  }
}
