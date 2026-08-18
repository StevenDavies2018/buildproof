import fs from 'node:fs'
import path from 'node:path'
import postgres from 'postgres'
import {
  buildCategoryAnalysisRows,
  CATEGORY_ANALYSIS_SNAPSHOT_DATE,
  CATEGORY_ANALYSIS_VERSION,
} from '../lib/analysis-metrics.js'

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
  const args = {}
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith('--')) continue
    args[argv[index].slice(2)] = argv[index + 1]
    index += 1
  }
  return args
}

async function main() {
  loadLocalEnv()
  if (!process.env.POSTGRES_URL) throw new Error('POSTGRES_URL is not configured')

  const args = parseArgs(process.argv.slice(2))
  const subsetKey = args['subset-key'] || 'ttrpg_poc'
  const analysisVersion = args['analysis-version'] || CATEGORY_ANALYSIS_VERSION
  const snapshotDate = args['snapshot-date'] || CATEGORY_ANALYSIS_SNAPSHOT_DATE
  const sql = postgres(process.env.POSTGRES_URL, { ssl: 'require' })

  try {
    const campaigns = await sql`
      SELECT DISTINCT ON (cr.id)
        cr.id,
        cr.launched_at_ts::text AS launched_at,
        cn.normalized_status,
        cn.funding_multiple,
        cr.backers_count,
        cmn.usd_goal,
        cmn.usd_pledged,
        primary_classification.taxonomy_node_id,
        primary_classification.taxonomy_label
      FROM subset_memberships sm
      INNER JOIN campaigns_raw cr ON cr.id = sm.campaign_id
      INNER JOIN campaigns_normalized cn ON cn.campaign_id = cr.id
      LEFT JOIN campaign_currency_normalizations cmn ON cmn.campaign_id = cr.id
      LEFT JOIN LATERAL (
        SELECT
          cc.taxonomy_node_id,
          tn.label AS taxonomy_label
        FROM campaign_classifications cc
        INNER JOIN taxonomy_nodes tn ON tn.id = cc.taxonomy_node_id
        WHERE cc.campaign_id = cr.id AND cc.is_primary = true
        ORDER BY cc.created_at DESC, cc.id DESC
        LIMIT 1
      ) primary_classification ON true
      WHERE sm.subset_key = ${subsetKey}
        AND sm.membership_status <> 'exclude'
      ORDER BY cr.id, sm.created_at DESC
    `

    const [versions] = await sql`
      SELECT
        MAX(di.snapshot_version) AS source_snapshot_version,
        MAX(cmn.normalization_version) AS currency_normalization_version,
        MAX(cc.classification_version) AS classification_version
      FROM subset_memberships sm
      INNER JOIN campaigns_raw cr ON cr.id = sm.campaign_id
      LEFT JOIN dataset_imports di ON di.id = cr.dataset_import_id
      LEFT JOIN campaign_currency_normalizations cmn ON cmn.campaign_id = cr.id
      LEFT JOIN campaign_classifications cc ON cc.campaign_id = cr.id
      WHERE sm.subset_key = ${subsetKey}
    `

    const metrics = buildCategoryAnalysisRows(campaigns, snapshotDate)
    const calculatedAt = new Date()
    const rows = metrics.map((metric) => ({
      subset_key: subsetKey,
      dimension_key: metric.dimensionKey,
      taxonomy_node_id: metric.taxonomyNodeId,
      taxonomy_label: metric.taxonomyLabel,
      metric_window: metric.metricWindow,
      window_start: metric.windowStart,
      window_end: metric.windowEnd,
      campaign_count: metric.campaignCount,
      success_count: metric.successCount,
      failure_count: metric.failureCount,
      success_rate: metric.successRate,
      median_goal_usd: metric.medianGoalUsd,
      median_pledged_usd: metric.medianPledgedUsd,
      median_backers: metric.medianBackers,
      median_average_pledge_usd: metric.medianAveragePledgeUsd,
      median_funding_multiple: metric.medianFundingMultiple,
      recent_campaign_count: metric.recentCampaignCount,
      money_comparable_count: metric.moneyComparableCount,
      trend_label: metric.trendLabel,
      trend_details_json: metric.trendDetails,
      source_snapshot_version: versions.source_snapshot_version,
      currency_normalization_version: versions.currency_normalization_version,
      classification_version: versions.classification_version,
      analysis_version: analysisVersion,
      calculated_at: calculatedAt,
    }))

    const columns = Object.keys(rows[0])
    await sql.begin(async (transaction) => {
      await transaction`
        DELETE FROM analysis_category_metrics
        WHERE subset_key = ${subsetKey} AND analysis_version = ${analysisVersion}
      `
      for (let offset = 0; offset < rows.length; offset += 250) {
        await transaction`
          INSERT INTO analysis_category_metrics ${transaction(rows.slice(offset, offset + 250), ...columns)}
        `
      }
    })

    console.log(JSON.stringify({
      subsetKey,
      analysisVersion,
      snapshotDate,
      campaignsRead: campaigns.length,
      dimensions: new Set(rows.map((row) => row.dimension_key)).size,
      metricRowsWritten: rows.length,
      sourceVersions: versions,
    }, null, 2))
  } finally {
    await sql.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
