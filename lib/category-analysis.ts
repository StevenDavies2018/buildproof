import { getSql, hasDatabaseConfig } from '@/lib/db'

export type CategoryAnalysisMetric = {
  dimensionKey: string
  taxonomyNodeId: number | null
  taxonomyLabel: string
  metricWindow: 'all_time' | 'last_24_months'
  windowStart: string | null
  windowEnd: string
  campaignCount: number
  successCount: number
  failureCount: number
  successRate: number | null
  medianGoalUsd: number | null
  medianPledgedUsd: number | null
  medianBackers: number | null
  medianAveragePledgeUsd: number | null
  medianFundingMultiple: number | null
  recentCampaignCount: number
  moneyComparableCount: number
  trendLabel: 'rising' | 'steady' | 'softening' | 'insufficient_data'
  trendDetails: {
    method?: string
    periods?: Record<string, unknown>
    years?: Array<Record<string, unknown>>
  }
  sourceSnapshotVersion: string | null
  currencyNormalizationVersion: string | null
  classificationVersion: string | null
  analysisVersion: string
  calculatedAt: string
}

type CategoryAnalysisMetricRow = Omit<
  CategoryAnalysisMetric,
  | 'taxonomyNodeId'
  | 'successRate'
  | 'medianGoalUsd'
  | 'medianPledgedUsd'
  | 'medianBackers'
  | 'medianAveragePledgeUsd'
  | 'medianFundingMultiple'
  | 'trendDetails'
> & {
  taxonomyNodeId: number | string | null
  successRate: number | string | null
  medianGoalUsd: number | string | null
  medianPledgedUsd: number | string | null
  medianBackers: number | string | null
  medianAveragePledgeUsd: number | string | null
  medianFundingMultiple: number | string | null
  trendDetails: CategoryAnalysisMetric['trendDetails']
}

function nullableNumber(value: number | string | null) {
  if (value === null) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function mapMetric(row: CategoryAnalysisMetricRow): CategoryAnalysisMetric {
  return {
    ...row,
    taxonomyNodeId: nullableNumber(row.taxonomyNodeId),
    successRate: nullableNumber(row.successRate),
    medianGoalUsd: nullableNumber(row.medianGoalUsd),
    medianPledgedUsd: nullableNumber(row.medianPledgedUsd),
    medianBackers: nullableNumber(row.medianBackers),
    medianAveragePledgeUsd: nullableNumber(row.medianAveragePledgeUsd),
    medianFundingMultiple: nullableNumber(row.medianFundingMultiple),
  }
}

function isTransientDatabaseError(error: unknown): boolean {
  if (error instanceof AggregateError) {
    return error.errors.some(isTransientDatabaseError)
  }
  if (!(error instanceof Error)) return false

  const code = 'code' in error ? String(error.code) : ''
  return (
    code.startsWith('08') ||
    ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE', '57P01', '57P02', '57P03', '53300'].includes(code) ||
    /connection (?:closed|terminated|destroyed)|connect timeout|socket hang up/i.test(error.message)
  )
}

async function queryCategoryAnalysisMetrics(
  metricWindow: CategoryAnalysisMetric['metricWindow'],
) {
  const sql = getSql()

  try {
    return await sql<CategoryAnalysisMetricRow[]>`
      SELECT
        dimension_key AS "dimensionKey",
        taxonomy_node_id AS "taxonomyNodeId",
        taxonomy_label AS "taxonomyLabel",
        metric_window AS "metricWindow",
        window_start::text AS "windowStart",
        window_end::text AS "windowEnd",
        campaign_count AS "campaignCount",
        success_count AS "successCount",
        failure_count AS "failureCount",
        success_rate AS "successRate",
        median_goal_usd AS "medianGoalUsd",
        median_pledged_usd AS "medianPledgedUsd",
        median_backers AS "medianBackers",
        median_average_pledge_usd AS "medianAveragePledgeUsd",
        median_funding_multiple AS "medianFundingMultiple",
        recent_campaign_count AS "recentCampaignCount",
        money_comparable_count AS "moneyComparableCount",
        trend_label AS "trendLabel",
        trend_details_json AS "trendDetails",
        source_snapshot_version AS "sourceSnapshotVersion",
        currency_normalization_version AS "currencyNormalizationVersion",
        classification_version AS "classificationVersion",
        analysis_version AS "analysisVersion",
        calculated_at::text AS "calculatedAt"
      FROM analysis_category_metrics
      WHERE subset_key = 'ttrpg_poc'
        AND metric_window = ${metricWindow}
        AND analysis_version = (
          SELECT analysis_version
          FROM analysis_category_metrics
          WHERE subset_key = 'ttrpg_poc'
          ORDER BY calculated_at DESC
          LIMIT 1
        )
      ORDER BY
        CASE WHEN dimension_key = 'all' THEN 0 ELSE 1 END,
        campaign_count DESC,
        taxonomy_label ASC
    `
  } finally {
    await sql.end()
  }
}

export async function getCategoryAnalysisMetrics(
  metricWindow: CategoryAnalysisMetric['metricWindow'] = 'all_time',
) {
  if (!hasDatabaseConfig()) return [] as CategoryAnalysisMetric[]

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const rows = await queryCategoryAnalysisMetrics(metricWindow)
      return rows.map(mapMetric)
    } catch (error) {
      if (attempt === 1 || !isTransientDatabaseError(error)) throw error
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  return [] as CategoryAnalysisMetric[]
}
