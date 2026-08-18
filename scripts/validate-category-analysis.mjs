import fs from 'node:fs'
import path from 'node:path'
import postgres from 'postgres'
import { CATEGORY_ANALYSIS_VERSION } from '../lib/analysis-metrics.js'

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
  if (!process.env.POSTGRES_URL) throw new Error('POSTGRES_URL is not configured')
  const sql = postgres(process.env.POSTGRES_URL, { ssl: 'require' })

  try {
    const [summary] = await sql`
      WITH expected AS (
        SELECT COUNT(DISTINCT cr.id)::int AS campaign_count
        FROM subset_memberships sm
        INNER JOIN campaigns_raw cr ON cr.id = sm.campaign_id
        WHERE sm.subset_key = 'ttrpg_poc' AND sm.membership_status <> 'exclude'
      )
      SELECT
        expected.campaign_count AS expected_campaigns,
        COUNT(*)::int AS metric_rows,
        COUNT(DISTINCT acm.dimension_key)::int AS dimensions,
        COUNT(*) FILTER (
          WHERE acm.dimension_key = 'all' AND acm.metric_window = 'all_time'
        )::int AS overall_rows,
        MAX(acm.campaign_count) FILTER (
          WHERE acm.dimension_key = 'all' AND acm.metric_window = 'all_time'
        )::int AS overall_campaigns,
        COUNT(*) FILTER (
          WHERE acm.success_count + acm.failure_count > acm.campaign_count
        )::int AS invalid_outcome_counts,
        COUNT(*) FILTER (
          WHERE acm.money_comparable_count > acm.campaign_count
        )::int AS invalid_money_counts,
        COUNT(*) FILTER (
          WHERE acm.success_rate IS NOT NULL
            AND (acm.success_rate < 0 OR acm.success_rate > 100)
        )::int AS invalid_success_rates,
        COUNT(*) FILTER (
          WHERE acm.trend_label NOT IN ('rising', 'steady', 'softening', 'insufficient_data')
        )::int AS invalid_trend_labels,
        COUNT(*) FILTER (
          WHERE jsonb_typeof(acm.trend_details_json->'years') <> 'array'
        )::int AS invalid_trend_details
      FROM analysis_category_metrics acm
      CROSS JOIN expected
      WHERE acm.subset_key = 'ttrpg_poc'
        AND acm.analysis_version = ${CATEGORY_ANALYSIS_VERSION}
      GROUP BY expected.campaign_count
    `

    const [duplicates] = await sql`
      SELECT COUNT(*)::int AS duplicate_groups
      FROM (
        SELECT dimension_key, metric_window, COUNT(*)
        FROM analysis_category_metrics
        WHERE subset_key = 'ttrpg_poc'
          AND analysis_version = ${CATEGORY_ANALYSIS_VERSION}
        GROUP BY dimension_key, metric_window
        HAVING COUNT(*) > 1
      ) duplicate_rows
    `

    const topCategories = await sql`
      SELECT
        taxonomy_label,
        campaign_count,
        success_rate::float8,
        median_goal_usd::float8,
        median_pledged_usd::float8,
        median_backers::float8,
        trend_label,
        money_comparable_count
      FROM analysis_category_metrics
      WHERE subset_key = 'ttrpg_poc'
        AND analysis_version = ${CATEGORY_ANALYSIS_VERSION}
        AND metric_window = 'all_time'
        AND dimension_key <> 'all'
      ORDER BY campaign_count DESC, taxonomy_label ASC
      LIMIT 10
    `

    const report = {
      analysisVersion: CATEGORY_ANALYSIS_VERSION,
      summary: summary ?? null,
      duplicateGroups: duplicates.duplicate_groups,
      topCategories,
    }
    console.log(JSON.stringify(report, null, 2))

    const failed =
      !summary ||
      summary.metric_rows !== summary.dimensions * 2 ||
      summary.overall_rows !== 1 ||
      summary.overall_campaigns !== summary.expected_campaigns ||
      summary.invalid_outcome_counts > 0 ||
      summary.invalid_money_counts > 0 ||
      summary.invalid_success_rates > 0 ||
      summary.invalid_trend_labels > 0 ||
      summary.invalid_trend_details > 0 ||
      duplicates.duplicate_groups > 0

    if (failed) process.exitCode = 1
  } finally {
    await sql.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
