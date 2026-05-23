/* Tweet scraping disabled in the Vercel migration — keeping the endpoint
 * so the frontend doesn't break. Returns an empty array; the XOpinions
 * component already handles "no tweets" gracefully (renders nothing).
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json([])
}
