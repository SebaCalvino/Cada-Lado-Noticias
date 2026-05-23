/* Manual scrape trigger — also reused by Vercel Cron */

import { NextRequest, NextResponse } from 'next/server'
import { runScrapingPipeline } from '@/lib/pipeline'

export const dynamic = 'force-dynamic'
export const maxDuration = 60   // seconds (max for Vercel Hobby cron / regular fn on Pro)

export async function POST(req: NextRequest) {
  // Optional CRON_SECRET protection
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') ?? ''
    const provided = auth.replace(/^Bearer\s+/i, '')
    if (provided !== secret) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await runScrapingPipeline()
    return NextResponse.json({
      status: 'ok',
      message: `Scraped ${result.scraped} new articles, created ${result.clustersCreated} clusters`,
      ...result,
    })
  } catch (e) {
    console.error('POST /api/scrape failed:', e)
    return NextResponse.json({
      status: 'error',
      message: (e as Error).message,
    }, { status: 500 })
  }
}

// GET also runs the pipeline — convenient for hitting the URL from a browser the first time
export async function GET(req: NextRequest) {
  return POST(req)
}
