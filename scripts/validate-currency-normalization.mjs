import fs from 'node:fs'
import path from 'node:path'
import postgres from 'postgres'

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

async function main() {
  loadLocalEnv()
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not configured in the environment or .env.local')
  }

  const sql = postgres(process.env.POSTGRES_URL, { ssl: 'require' })

  try {
    const [summary] = await sql`
      WITH poc_campaigns AS (
        SELECT DISTINCT cr.id
        FROM campaigns_raw cr
        INNER JOIN subset_memberships sm ON sm.campaign_id = cr.id
        WHERE sm.subset_key = 'ttrpg_poc'
      )
      SELECT
        COUNT(*)::int AS total_campaigns,
        COUNT(cmn.campaign_id)::int AS normalized_rows,
        COUNT(*) FILTER (
          WHERE cmn.usd_goal IS NOT NULL AND cmn.usd_pledged IS NOT NULL
        )::int AS comparable_money_rows,
        COUNT(*) FILTER (WHERE cmn.rate_confidence = 'high')::int AS high_confidence_rows,
        COUNT(*) FILTER (WHERE cmn.rate_source = 'unavailable')::int AS unavailable_rows,
        COUNT(*) FILTER (WHERE cmn.usd_rate IS NOT NULL AND cmn.usd_rate <= 0)::int AS invalid_rates,
        COUNT(*) FILTER (
          WHERE cmn.native_currency = 'USD' AND cmn.usd_rate <> 1
        )::int AS invalid_native_usd_rates,
        COUNT(*) FILTER (
          WHERE cmn.usd_goal IS NOT NULL
            AND ABS(cmn.usd_goal - (cmn.native_goal * cmn.usd_rate)) > 0.01
        )::int AS goal_formula_mismatches,
        COUNT(*) FILTER (
          WHERE cmn.usd_pledged IS NOT NULL
            AND ABS(cmn.usd_pledged - (cmn.native_pledged * cmn.usd_rate)) > 0.01
        )::int AS pledged_formula_mismatches
      FROM poc_campaigns pc
      LEFT JOIN campaign_currency_normalizations cmn ON cmn.campaign_id = pc.id
    `

    const bySource = await sql`
      SELECT
        cmn.rate_source,
        cmn.rate_confidence,
        COUNT(*)::int AS campaign_count
      FROM campaign_currency_normalizations cmn
      INNER JOIN subset_memberships sm ON sm.campaign_id = cmn.campaign_id
      WHERE sm.subset_key = 'ttrpg_poc'
      GROUP BY cmn.rate_source, cmn.rate_confidence
      ORDER BY COUNT(*) DESC
    `

    const byCurrency = await sql`
      SELECT
        cmn.native_currency,
        COUNT(*)::int AS campaign_count,
        COUNT(*) FILTER (WHERE cmn.usd_goal IS NOT NULL)::int AS normalized_goal_count
      FROM campaign_currency_normalizations cmn
      INNER JOIN subset_memberships sm ON sm.campaign_id = cmn.campaign_id
      WHERE sm.subset_key = 'ttrpg_poc'
      GROUP BY cmn.native_currency
      ORDER BY COUNT(*) DESC, cmn.native_currency
    `

    const unavailableReasons = await sql`
      SELECT
        COUNT(*) FILTER (WHERE cr.goal IS NULL)::int AS missing_goal,
        COUNT(*) FILTER (WHERE cr.pledged IS NULL)::int AS missing_pledged,
        COUNT(*) FILTER (WHERE cr.currency IS NULL)::int AS missing_currency,
        COUNT(*) FILTER (
          WHERE cr.currency <> 'USD'
            AND cr.raw_payload_json->'data'->>'static_usd_rate' IS NULL
        )::int AS missing_static_rate,
        COUNT(*) FILTER (
          WHERE COALESCE(NULLIF(cr.raw_payload_json->'data'->>'static_usd_rate', '')::numeric, 0) <= 0
        )::int AS non_positive_static_rate,
        COUNT(*) FILTER (
          WHERE COALESCE(NULLIF(cr.raw_payload_json->'data'->>'usd_exchange_rate', '')::numeric, 0) > 0
        )::int AS has_positive_usd_exchange_rate,
        COUNT(*) FILTER (
          WHERE COALESCE(NULLIF(cr.raw_payload_json->'data'->>'fx_rate', '')::numeric, 0) > 0
        )::int AS has_positive_fx_rate
      FROM campaign_currency_normalizations cmn
      INNER JOIN campaigns_raw cr ON cr.id = cmn.campaign_id
      WHERE cmn.rate_source = 'unavailable'
    `

    const unavailableByState = await sql`
      SELECT
        cr.raw_state,
        COUNT(*)::int AS campaign_count
      FROM campaign_currency_normalizations cmn
      INNER JOIN campaigns_raw cr ON cr.id = cmn.campaign_id
      WHERE cmn.rate_source = 'unavailable'
      GROUP BY cr.raw_state
      ORDER BY COUNT(*) DESC
    `

    const knownNonUsdExample = await sql`
      SELECT
        cr.project_name,
        cmn.native_currency,
        cmn.native_goal::text,
        cmn.usd_goal::text,
        cmn.native_pledged::text,
        cmn.usd_pledged::text,
        cmn.usd_rate::text,
        cmn.rate_source,
        cmn.rate_confidence,
        cmn.source_snapshot_version
      FROM campaigns_raw cr
      INNER JOIN campaign_currency_normalizations cmn ON cmn.campaign_id = cr.id
      WHERE cr.project_url ILIKE '%world-of-pratheron-battle-of-eldrinos-deep%'
      LIMIT 1
    `

    const report = {
      summary,
      bySource,
      byCurrency,
      unavailableReasons: unavailableReasons[0] ?? null,
      unavailableByState,
      knownNonUsdExample: knownNonUsdExample[0] ?? null,
    }
    console.log(JSON.stringify(report, null, 2))

    const failed =
      summary.normalized_rows !== summary.total_campaigns ||
      summary.invalid_rates > 0 ||
      summary.invalid_native_usd_rates > 0 ||
      summary.goal_formula_mismatches > 0 ||
      summary.pledged_formula_mismatches > 0

    if (failed) process.exitCode = 1
  } finally {
    await sql.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
