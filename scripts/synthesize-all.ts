/**
 * Run synthesis locally for all pending clusters.
 * Usage: npx tsx scripts/synthesize-all.ts
 */
import { runSynthesize } from '../lib/pipeline'

async function main() {
  console.log('🚀 Starting local synthesis for all pending clusters...')
  console.log('⏱️  ~20 seconds per cluster (Groq rate limit)\n')

  let totalSynth = 0
  let totalFailed = 0
  let round = 1

  while (true) {
    console.log(`--- Round ${round} ---`)
    const { synthesized, failed } = await runSynthesize(10)
    totalSynth += synthesized
    totalFailed += failed

    console.log(`  ✓ ${synthesized} synthesized, ✗ ${failed} failed/deleted`)
    console.log(`  Total so far: ${totalSynth} done, ${totalFailed} removed\n`)

    if (synthesized === 0 && failed === 0) {
      console.log('✅ No more pending clusters. Done!')
      break
    }

    round++
    if (round > 10) break // safety cap
  }

  console.log(`\n🎉 Finished! ${totalSynth} clusters published, ${totalFailed} removed (low quality)`)
  process.exit(0)
}

main().catch(e => { console.error('❌', e); process.exit(1) })
