import { buildFilteredCampaignsCte, type CategoryAnalysisMetric } from '@/lib/category-analysis'
import type { DashboardFilters } from '@/lib/dashboard'
import { getSql, hasDatabaseConfig } from '@/lib/db'

// Deterministic outcome breakdowns crossed with category, mirroring the same
// filtered_campaigns/distinct_grouped_campaigns CTE the category roster uses.
// These exist to answer "does goal size / duration change outcomes" with
// real grouped numbers rather than asking AI to infer a pattern from raw
// rows — the AI layer only ever narrates what these queries compute.

export type OutcomeBucketMetric = {
  taxonomyLabel: string
  bucketKey: string
  bucketLabel: string
  campaignCount: number
  successRate: number | null
  medianGoalUsd: number | null
  medianPledgedUsd: number | null
  medianBackers: number | null
  medianFundingMultiple: number | null
  moneyComparableCount: number
}

type OutcomeBucketRow = Omit<
  OutcomeBucketMetric,
  'successRate' | 'medianGoalUsd' | 'medianPledgedUsd' | 'medianBackers' | 'medianFundingMultiple'
> & {
  successRate: number | string | null
  medianGoalUsd: number | string | null
  medianPledgedUsd: number | string | null
  medianBackers: number | string | null
  medianFundingMultiple: number | string | null
}

function nullableNumber(value: number | string | null) {
  if (value === null) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function mapRow(row: OutcomeBucketRow, bucketLabels: Record<string, string>): OutcomeBucketMetric {
  return {
    taxonomyLabel: row.taxonomyLabel,
    bucketKey: row.bucketKey,
    bucketLabel: bucketLabels[row.bucketKey] ?? row.bucketKey,
    campaignCount: row.campaignCount,
    successRate: nullableNumber(row.successRate),
    medianGoalUsd: nullableNumber(row.medianGoalUsd),
    medianPledgedUsd: nullableNumber(row.medianPledgedUsd),
    medianBackers: nullableNumber(row.medianBackers),
    medianFundingMultiple: nullableNumber(row.medianFundingMultiple),
    moneyComparableCount: row.moneyComparableCount,
  }
}

export const GOAL_BUCKET_ORDER = ['under_1k', '1k_5k', '5k_15k', '15k_50k', '50k_150k', '150k_plus', 'unknown']

export const GOAL_BUCKET_LABELS: Record<string, string> = {
  under_1k: 'Under $1,000',
  '1k_5k': '$1,000 - $4,999',
  '5k_15k': '$5,000 - $14,999',
  '15k_50k': '$15,000 - $49,999',
  '50k_150k': '$50,000 - $149,999',
  '150k_plus': '$150,000+',
  unknown: 'Unknown goal',
}

export const DURATION_BUCKET_ORDER = ['short', 'medium', 'long', 'unknown']

export const DURATION_BUCKET_LABELS: Record<string, string> = {
  short: 'Short (1-15 days)',
  medium: 'Medium (16-30 days)',
  long: 'Long (31+ days)',
  unknown: 'Unknown duration',
}

async function runGoalSizeQuery(
  metricWindow: CategoryAnalysisMetric['metricWindow'],
  inputFilters: DashboardFilters,
) {
  const sql = getSql()
  // Ignore any incoming minGoal floor filter here specifically — otherwise
  // a user-set minimum would silently collapse the lower buckets to zero
  // instead of showing the real distribution across all of them.
  const { filteredCampaigns } = buildFilteredCampaignsCte(sql, metricWindow, inputFilters, { ignoreMinGoal: true })

    const rows = await sql<OutcomeBucketRow[]>`
      ${filteredCampaigns}
      SELECT
        gc.taxonomy_label AS "taxonomyLabel",
        CASE
          WHEN gc.usd_goal IS NULL THEN 'unknown'
          WHEN gc.usd_goal < 1000 THEN 'under_1k'
          WHEN gc.usd_goal < 5000 THEN '1k_5k'
          WHEN gc.usd_goal < 15000 THEN '5k_15k'
          WHEN gc.usd_goal < 50000 THEN '15k_50k'
          WHEN gc.usd_goal < 150000 THEN '50k_150k'
          ELSE '150k_plus'
        END AS "bucketKey",
        COUNT(*)::int AS "campaignCount",
        COALESCE(
          ROUND(
            (
              COUNT(*) FILTER (WHERE gc.normalized_status = 'successful')::numeric
              / NULLIF(COUNT(*) FILTER (WHERE gc.normalized_status IN ('successful', 'unsuccessful')), 0)
            ) * 100,
            1
          )::float8,
          NULL
        ) AS "successRate",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gc.usd_goal)
          FILTER (WHERE gc.usd_goal IS NOT NULL)::float8 AS "medianGoalUsd",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gc.usd_pledged)
          FILTER (WHERE gc.usd_pledged IS NOT NULL)::float8 AS "medianPledgedUsd",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gc.backers_count)
          FILTER (WHERE gc.backers_count IS NOT NULL)::float8 AS "medianBackers",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gc.funding_multiple)
          FILTER (WHERE gc.funding_multiple IS NOT NULL)::float8 AS "medianFundingMultiple",
        COUNT(*) FILTER (WHERE gc.usd_goal IS NOT NULL AND gc.usd_pledged IS NOT NULL)::int AS "moneyComparableCount"
      FROM distinct_grouped_campaigns gc
      GROUP BY gc.taxonomy_label, "bucketKey"
      ORDER BY gc.taxonomy_label ASC, "bucketKey" ASC
    `

    return rows.map((row) => mapRow(row, GOAL_BUCKET_LABELS))
}

async function runDurationQuery(
  metricWindow: CategoryAnalysisMetric['metricWindow'],
  inputFilters: DashboardFilters,
) {
  const sql = getSql()
  // Ignore any incoming durationBucket filter here specifically, for the
  // same reason minGoal is ignored above — this view exists to show all
  // duration buckets side by side, not whichever one is already selected.
  const { filteredCampaigns } = buildFilteredCampaignsCte(sql, metricWindow, inputFilters, {
    ignoreDurationBucket: true,
  })

    const rows = await sql<OutcomeBucketRow[]>`
      ${filteredCampaigns}
      SELECT
        gc.taxonomy_label AS "taxonomyLabel",
        CASE
          WHEN gc.campaign_duration_days IS NULL THEN 'unknown'
          WHEN gc.campaign_duration_days BETWEEN 1 AND 15 THEN 'short'
          WHEN gc.campaign_duration_days BETWEEN 16 AND 30 THEN 'medium'
          ELSE 'long'
        END AS "bucketKey",
        COUNT(*)::int AS "campaignCount",
        COALESCE(
          ROUND(
            (
              COUNT(*) FILTER (WHERE gc.normalized_status = 'successful')::numeric
              / NULLIF(COUNT(*) FILTER (WHERE gc.normalized_status IN ('successful', 'unsuccessful')), 0)
            ) * 100,
            1
          )::float8,
          NULL
        ) AS "successRate",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gc.usd_goal)
          FILTER (WHERE gc.usd_goal IS NOT NULL)::float8 AS "medianGoalUsd",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gc.usd_pledged)
          FILTER (WHERE gc.usd_pledged IS NOT NULL)::float8 AS "medianPledgedUsd",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gc.backers_count)
          FILTER (WHERE gc.backers_count IS NOT NULL)::float8 AS "medianBackers",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gc.funding_multiple)
          FILTER (WHERE gc.funding_multiple IS NOT NULL)::float8 AS "medianFundingMultiple",
        COUNT(*) FILTER (WHERE gc.usd_goal IS NOT NULL AND gc.usd_pledged IS NOT NULL)::int AS "moneyComparableCount"
      FROM distinct_grouped_campaigns gc
      GROUP BY gc.taxonomy_label, "bucketKey"
      ORDER BY gc.taxonomy_label ASC, "bucketKey" ASC
    `

    return rows.map((row) => mapRow(row, DURATION_BUCKET_LABELS))
}

export async function getGoalSizeAnalysisMetrics(
  metricWindow: CategoryAnalysisMetric['metricWindow'] = 'all_time',
  filters: DashboardFilters = {},
): Promise<OutcomeBucketMetric[]> {
  if (!hasDatabaseConfig()) return []
  return runGoalSizeQuery(metricWindow, filters)
}

export async function getDurationAnalysisMetrics(
  metricWindow: CategoryAnalysisMetric['metricWindow'] = 'all_time',
  filters: DashboardFilters = {},
): Promise<OutcomeBucketMetric[]> {
  if (!hasDatabaseConfig()) return []
  return runDurationQuery(metricWindow, filters)
}
