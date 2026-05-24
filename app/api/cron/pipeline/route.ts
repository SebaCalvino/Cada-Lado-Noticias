import { NextRequest, NextResponse } from 'next/server'
import { runPipeline } from '@/lib/pipeline'

export const runtime = 'nodejs'
export const maxDuration = 300

function checkAuth(request: NextRequest): boolean {
  if (!process.env.CRON_SECRET) return true
  const auth = request.headers.get('authorization') || request.headers.get('x-cron-secret')
  return auth === `Bearer ${process.env.CRON_SECRET}` || auth === process.env.CRON_SECRET
}

// Vercel cron jobs send GET requests
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await runPipeline()
    return NextResponse.json({ status: 'ok', message: 'Pipeline complete' })
  } catch (err) {
    console.error('Cron pipeline error:', err)
    return NextResponse.json({ error: 'Pipeline failed', detail: String(err) }, { status: 500 })
  }
}

// Keep POST for manual triggers (e.g. from /api/scrape or admin)
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await runPipeline()
    return NextResponse.json({ status: 'ok', message: 'Pipeline complete' })
  } catch (err) {
    console.error('Cron pipeline error:', err)
    return NextResponse.json({ error: 'Pipeline failed', detail: String(err) }, { status: 500 })
  }
}
