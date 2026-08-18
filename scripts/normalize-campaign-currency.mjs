import fs from 'node:fs'
import path from 'node:path'
import postgres from 'postgres'
import { normalizeCampaignMoney } from '../lib/currency-normalization.js'

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

function parseArgs(argv) {
  const args = { subsetKey: null }
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--subset-key') {
      args.subsetKey = argv[index + 1] ?? null
      index += 1
    }
  }
  return args
}

async function main() {
  loadLocalEnv()
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not configured in the environment or .env.local')
  }

  const { subsetKey } = parseArgs(process.argv.slice(2))
  const sql = postgres(process.env.POSTGRES_URL, { ssl: 'require' })

  try {
    const rows = subsetKey
      ? await sql`
          SELECT DISTINCT
            cr.id AS campaign_id,
            cr.currency,
            cr.goal,
            cr.pledged,
            cr.usd_pledged,
            cr.converted_pledged_amount,
            cr.raw_payload_json->'data'->>'static_usd_rate' AS static_usd_rate,
            cr.raw_payload_json->'data'->>'current_currency' AS current_currency,
            di.snapshot_version,
            di.imported_at
          FROM campaigns_raw cr
          INNER JOIN subset_memberships sm ON sm.campaign_id = cr.id
          LEFT JOIN dataset_imports di ON di.id = cr.dataset_import_id
          WHERE sm.subset_key = ${subsetKey}
        `
      : await sql`
          SELECT
            cr.id AS campaign_id,
            cr.currency,
            cr.goal,
            cr.pledged,
            cr.usd_pledged,
            cr.converted_pledged_amount,
            cr.raw_payload_json->'data'->>'static_usd_rate' AS static_usd_rate,
            cr.raw_payload_json->'data'->>'current_currency' AS current_currency,
            di.snapshot_version,
            di.imported_at
          FROM campaigns_raw cr
          LEFT JOIN dataset_imports di ON di.id = cr.dataset_import_id
        `

    const normalizedRows = rows.map((row) => {
      const normalized = normalizeCampaignMoney({
        currency: row.currency,
        goal: row.goal,
        pledged: row.pledged,
        usdPledged: row.usd_pledged,
        convertedPledgedAmount: row.converted_pledged_amount,
        staticUsdRate: row.static_usd_rate,
        currentCurrency: row.current_currency,
      })

      return {
        campaign_id: row.campaign_id,
        normalization_version: normalized.normalizationVersion,
        native_currency: normalized.nativeCurrency,
        native_goal: normalized.nativeGoal,
        native_pledged: normalized.nativePledged,
        usd_rate: normalized.usdRate,
        usd_goal: normalized.usdGoal,
        usd_pledged: normalized.usdPledged,
        rate_source: normalized.rateSource,
        rate_confidence: normalized.rateConfidence,
        current_currency: normalized.currentCurrency,
        source_snapshot_version: row.snapshot_version,
        source_observed_at: row.imported_at,
        normalized_at: new Date(),
      }
    })

    const columns = [
      'campaign_id',
      'normalization_version',
      'native_currency',
      'native_goal',
      'native_pledged',
      'usd_rate',
      'usd_goal',
      'usd_pledged',
      'rate_source',
      'rate_confidence',
      'current_currency',
      'source_snapshot_version',
      'source_observed_at',
      'normalized_at',
    ]

    for (let offset = 0; offset < normalizedRows.length; offset += 500) {
      const batch = normalizedRows.slice(offset, offset + 500)
      await sql`
        INSERT INTO campaign_currency_normalizations ${sql(batch, ...columns)}
        ON CONFLICT (campaign_id) DO UPDATE SET
          normalization_version = EXCLUDED.normalization_version,
          native_currency = EXCLUDED.native_currency,
          native_goal = EXCLUDED.native_goal,
          native_pledged = EXCLUDED.native_pledged,
          usd_rate = EXCLUDED.usd_rate,
          usd_goal = EXCLUDED.usd_goal,
          usd_pledged = EXCLUDED.usd_pledged,
          rate_source = EXCLUDED.rate_source,
          rate_confidence = EXCLUDED.rate_confidence,
          current_currency = EXCLUDED.current_currency,
          source_snapshot_version = EXCLUDED.source_snapshot_version,
          source_observed_at = EXCLUDED.source_observed_at,
          normalized_at = EXCLUDED.normalized_at
      `
    }

    const coverage = normalizedRows.reduce(
      (summary, row) => {
        summary.total += 1
        summary[row.rate_confidence] = (summary[row.rate_confidence] ?? 0) + 1
        return summary
      },
      { total: 0 },
    )

    console.log(JSON.stringify({ subsetKey: subsetKey ?? 'all', coverage }, null, 2))
  } finally {
    await sql.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
