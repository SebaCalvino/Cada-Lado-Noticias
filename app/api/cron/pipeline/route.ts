import { NextRequest, NextResponse } from 'next/server'
import { runPipeline } from '@/lib/pipeline'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret') || request.headers.get('authorization')

  if (process.env.CRON_SECRET) {
    const expected = `Bearer ${process.env.CRON_SECRET}`
    if (cronSecret !== expected && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    await runPipeline()
    return NextResponse.json({ status: 'ok', message: 'Pipeline complete' })
  } catch (err) {
    console.error('Cron pipeline error:', err)
    return NextResponse.json(
      { error: 'Pipeline failed', detail: String(err) },
      { status: 500 }
    )
  }
}
