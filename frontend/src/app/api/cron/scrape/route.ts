/* Vercel Cron target — runs the scrape pipeline.
 * Vercel automatically calls this on the schedule defined in vercel.json.
 */
import { NextRequest, NextResponse } from 'next/server'
import { runScrapingPipeline, backfillMissingImages } from '@/lib/pipeline'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Vercel Cron sends a special bearer token — when CRON_SECRET is set, verify it.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ status: 'unauthorized' }, { status: 401 })
    }
  }

  console.log('Cron triggered: scraping pipeline')
  try {
    const result = await runScrapingPipeline()
    const filledImages = await backfillMissingImages(15).catch(() => 0)
    return NextResponse.json({ status: 'ok', ...result, backfilledImages: filledImages })
  } catch (e) {
    console.error('Cron pipeline failed:', e)
    return NextResponse.json({ status: 'error', message: (e as Error).message }, { status: 500 })
  }
}
