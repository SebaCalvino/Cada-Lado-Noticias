import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  // Fire and forget — don't await
  import('@/lib/pipeline').then(({ runPipeline }) => {
    runPipeline().catch((err) => console.error('Pipeline error:', err))
  })

  return NextResponse.json({ status: 'ok', message: 'Scraping iniciado en background' })
}
