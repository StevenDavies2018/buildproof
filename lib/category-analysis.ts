import { getSql, hasDatabaseConfig } from '@/lib/db'
import type { DashboardFilters } from '@/lib/dashboard'
import { tokenizeResearchIdea } from '@/lib/research-query'

const ACTIVE_DATASET_SCOPE = 'full_dataset'
const SNAPSHOT_END = new Date('2026-08-12T23:59:59Z')
const RECENT_CUTOFF = new Date('2024-08-17T00:00:00Z')

export type CategoryAnalysisMetric = {
  dimensionKey: string
  taxonomyNodeId: number | null
  taxonomyLabel: string
  taxonomyParentLabel: string | null
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

export type CategoryYearRow = {
  launchYear: number
  campaignCount: number
  completedCount: number
  successCount: number
  failureCount: number
  successRate: number | null
  medianGoalUsd: number | null
  medianPledgedUsd: number | null
  medianBackers: number | null
  medianAveragePledgeUsd: number | null
  medianFundingMultiple: number | null
  moneyComparableCount: number
}

function unknownToNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

// Shared by Reporting's yearly-activity cards and AI Co-Pilot's year-trend
// context so both read the same materialized trend_details_json, not two
// separately maintained parsers.
export function getMetricYearRows(metric: Pick<CategoryAnalysisMetric, 'trendDetails'>): CategoryYearRow[] {
  if (!Array.isArray(metric.trendDetails.years)) return []

  return metric.trendDetails.years
    .map((row) => {
      const launchYear = unknownToNumber(row.launchYear)
      const campaignCount = unknownToNumber(row.campaignCount)
      if (launchYear === null || campaignCount === null) return null

      return {
        launchYear,
        campaignCount,
        completedCount: unknownToNumber(row.completedCount) ?? 0,
        successCount: unknownToNumber(row.successCount) ?? 0,
        failureCount: unknownToNumber(row.failureCount) ?? 0,
        successRate: unknownToNumber(row.successRate),
        medianGoalUsd: unknownToNumber(row.medianGoalUsd),
        medianPledgedUsd: unknownToNumber(row.medianPledgedUsd),
        medianBackers: unknownToNumber(row.medianBackers),
        medianAveragePledgeUsd: unknownToNumber(row.medianAveragePledgeUsd),
        medianFundingMultiple: unknownToNumber(row.medianFundingMultiple),
        moneyComparableCount: unknownToNumber(row.moneyComparableCount) ?? 0,
      }
    })
    .filter((row): row is CategoryYearRow => row !== null)
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
}

type CategoryAnalysisYearRow = {
  dimensionKey: string
  launchYear: number | string
  campaignCount: number | string
  completedCount: number | string
  successCount: number | string
  failureCount: number | string
  successRate: number | string | null
  medianGoalUsd: number | string | null
  medianPledgedUsd: number | string | null
  medianBackers: number | string | null
  medianAveragePledgeUsd: number | string | null
  medianFundingMultiple: number | string | null
  moneyComparableCount: number | string
}

type RequiredCategoryFilters = Required<DashboardFilters>

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function toRequiredFilters(filters: DashboardFilters): RequiredCategoryFilters {
  return {
    view: filters.view === 'analysis' ? 'analysis' : 'campaigns',
    search: text(filters.search),
    membershipStatus: text(filters.membershipStatus),
    confidenceLabel: text(filters.confidenceLabel),
    categorySlug: text(filters.categorySlug) === '__all__' ? '' : text(filters.categorySlug),
    categoryParent: text(filters.categoryParent) === '__all__' ? '' : text(filters.categoryParent),
    taxonomyLabel: text(filters.taxonomyLabel),
    durationBucket: text(filters.durationBucket),
    rawState: text(filters.rawState),
    minGoal: text(filters.minGoal),
    minPledged: text(filters.minPledged),
    cardLimit: text(filters.cardLimit) || '12',
    cardOffset: text(filters.cardOffset) || '0',
    sortBy: text(filters.sortBy) || 'recommended',
    sortDir: filters.sortDir === 'asc' ? 'asc' : 'desc',
    years: text(filters.years),
    launchWindow: text(filters.launchWindow),
    minimumBackers: text(filters.minimumBackers),
    includeFailures: filters.includeFailures === 'false' ? 'false' : 'true',
    fullyResearchableOnly: filters.fullyResearchableOnly === 'true' ? 'true' : 'false',
  }
}

function nullableNumber(value: number | string | null) {
  if (value === null) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function resolveLaunchWindowStart(launchWindow: string) {
  const now = new Date('2026-08-17T00:00:00Z')

  switch (launchWindow) {
    case '1m':
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, now.getUTCDate()))
    case '3m':
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, now.getUTCDate()))
    case '6m':
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, now.getUTCDate()))
    case '12m':
      return new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate()))
    case '24m':
      return new Date(Date.UTC(now.getUTCFullYear() - 2, now.getUTCMonth(), now.getUTCDate()))
    default:
      return null
  }
}

function resolveMetricWindowStart(metricWindow: CategoryAnalysisMetric['metricWindow']) {
  if (metricWindow === 'last_24_months') {
    return new Date('2024-08-12T00:00:00Z')
  }

  return null
}

function resolveTrend(years: Array<Record<string, unknown>>) {
  const rows = years
    .map((row) => ({
      launchYear: nullableNumber(row.launchYear as number | string | null),
      campaignCount: nullableNumber(row.campaignCount as number | string | null),
    }))
    .filter((row): row is { launchYear: number; campaignCount: number } => (
      row.launchYear !== null && row.campaignCount !== null
    ))
    .sort((left, right) => left.launchYear - right.launchYear)

  if (rows.length < 4) {
    return 'insufficient_data' as const
  }

  const recentTwo = rows.slice(-2).reduce((sum, row) => sum + row.campaignCount, 0)
  const priorTwo = rows.slice(-4, -2).reduce((sum, row) => sum + row.campaignCount, 0)

  if (priorTwo === 0) return 'insufficient_data' as const

  const ratio = recentTwo / priorTwo
  if (ratio >= 1.15) return 'rising' as const
  if (ratio <= 0.85) return 'softening' as const
  return 'steady' as const
}

function mapMetric(
  row: CategoryAnalysisMetricRow,
  years: Array<Record<string, unknown>>,
): CategoryAnalysisMetric {
  return {
    ...row,
    taxonomyNodeId: nullableNumber(row.taxonomyNodeId),
    successRate: nullableNumber(row.successRate),
    medianGoalUsd: nullableNumber(row.medianGoalUsd),
    medianPledgedUsd: nullableNumber(row.medianPledgedUsd),
    medianBackers: nullableNumber(row.medianBackers),
    medianAveragePledgeUsd: nullableNumber(row.medianAveragePledgeUsd),
    medianFundingMultiple: nullableNumber(row.medianFundingMultiple),
    trendLabel: resolveTrend(years),
    trendDetails: {
      method: 'year-over-year-count-ratio',
      years,
    },
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

// Shared by the category roster, and by the goal-size / duration outcome
// breakdowns in lib/outcome-analysis.ts, so every analysis surface applies
// the exact same filter semantics to the exact same underlying campaign set.
// `options` lets a caller drop one specific bucketing filter (e.g. duration)
// so that dimension's own buckets stay visible instead of collapsing to one.
export function buildFilteredCampaignsCte(
  sql: ReturnType<typeof getSql>,
  metricWindow: CategoryAnalysisMetric['metricWindow'],
  inputFilters: DashboardFilters,
  options: { ignoreDurationBucket?: boolean; ignoreMinGoal?: boolean } = {},
) {
  const filters = toRequiredFilters(inputFilters)
  const minimumBackersValue =
    filters.minimumBackers !== '' && Number.isFinite(Number(filters.minimumBackers))
      ? Number(filters.minimumBackers)
      : null
  const minGoalValue =
    filters.minGoal !== '' && Number.isFinite(Number(filters.minGoal))
      ? Number(filters.minGoal)
      : null
  const minPledgedValue =
    filters.minPledged !== '' && Number.isFinite(Number(filters.minPledged))
      ? Number(filters.minPledged)
      : null
  const selectedYears = Array.from(
    new Set(
      filters.years
        .split(',')
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isInteger(value) && value >= 2000 && value <= 2100),
    ),
  ).sort((a, b) => a - b)
  const searchTerms = tokenizeResearchIdea(filters.search)
  const searchPatterns = searchTerms.flatMap((term) =>
    term === 'dnd'
      ? ['(^|[^a-z0-9])dnd([^a-z0-9]|$)', '(^|[^a-z0-9])d&d([^a-z0-9]|$)']
      : [`(^|[^a-z0-9])${term}([^a-z0-9]|$)`],
  )
  const metricWindowStart = resolveMetricWindowStart(metricWindow)
  const launchWindowStart = resolveLaunchWindowStart(filters.launchWindow)
  const effectiveWindowStart =
    metricWindowStart && launchWindowStart
      ? (metricWindowStart > launchWindowStart ? metricWindowStart : launchWindowStart)
      : metricWindowStart ?? launchWindowStart

  {
    const searchFilter =
      searchPatterns.length === 0
        ? sql``
        : sql`
            AND (
              cr.project_name ~* ANY(${searchPatterns}::text[])
              OR COALESCE(cr.blurb, '') ~* ANY(${searchPatterns}::text[])
              OR COALESCE(cr.creator_name, '') ~* ANY(${searchPatterns}::text[])
              OR COALESCE(cr.kickstarter_category_name, '') ~* ANY(${searchPatterns}::text[])
              OR COALESCE(cr.kickstarter_category_slug, '') ~* ANY(${searchPatterns}::text[])
              OR COALESCE(
                cr.raw_payload_json->'data'->>'description',
                cr.raw_payload_json->'data'->>'story',
                cr.raw_payload_json->>'description',
                cr.raw_payload_json->>'story',
                ''
              ) ~* ANY(${searchPatterns}::text[])
              OR EXISTS (
                SELECT 1
                FROM campaign_classifications cc_search
                INNER JOIN taxonomy_nodes tn_search ON tn_search.id = cc_search.taxonomy_node_id
                WHERE cc_search.campaign_id = cr.id
                  AND tn_search.label ~* ANY(${searchPatterns}::text[])
              )
            )
          `

    const categoryFilter =
      filters.categorySlug === ''
        ? sql``
        : sql`AND COALESCE(cr.kickstarter_category_slug, '') = ${filters.categorySlug}`

    const categoryParentFilter =
      filters.categoryParent === ''
        ? sql``
        : sql`AND COALESCE(cr.kickstarter_parent_category_name, '') = ${filters.categoryParent}`

    const membershipFilter =
      filters.membershipStatus === ''
        ? sql``
        : sql`AND sm.membership_status = ${filters.membershipStatus}`

    const confidenceFilter =
      filters.confidenceLabel === ''
        ? sql``
        : sql`AND COALESCE(sm.confidence_label, '') = ${filters.confidenceLabel}`

    const rawStateFilter =
      filters.rawState === ''
        ? sql``
        : sql`AND COALESCE(cr.raw_state, '') = ${filters.rawState}`

    const durationFilter =
      options.ignoreDurationBucket || filters.durationBucket === ''
        ? sql``
        : filters.durationBucket === 'short'
          ? sql`AND cn.campaign_duration_days BETWEEN 1 AND 15`
          : filters.durationBucket === 'medium'
            ? sql`AND cn.campaign_duration_days BETWEEN 16 AND 30`
            : filters.durationBucket === 'long'
              ? sql`AND cn.campaign_duration_days IS NOT NULL AND cn.campaign_duration_days >= 31`
              : filters.durationBucket === 'unknown'
                ? sql`AND cn.campaign_duration_days IS NULL`
                : sql``

    const minGoalFilter =
      options.ignoreMinGoal || minGoalValue === null ? sql`` : sql`AND cmn.usd_goal >= ${minGoalValue}`
    const minPledgedFilter =
      minPledgedValue === null ? sql`` : sql`AND cmn.usd_pledged >= ${minPledgedValue}`

    const outcomeFilter =
      filters.rawState !== ''
        ? sql``
        : filters.includeFailures === 'false'
          ? sql`AND cn.normalized_status = 'successful'`
          : sql`AND cn.normalized_status IN ('successful', 'unsuccessful')`

    const launchWindowFilter =
      effectiveWindowStart === null
        ? sql``
        : sql`AND cr.launched_at_ts >= ${effectiveWindowStart}`

    const minimumBackersFilter =
      minimumBackersValue === null
        ? sql``
        : sql`AND COALESCE(cr.backers_count, 0) >= ${minimumBackersValue}`

    const researchableFilter =
      filters.fullyResearchableOnly === 'true'
        ? sql`AND cn.is_fully_researchable = true`
        : sql``

    const yearFilter =
      selectedYears.length === 0
        ? sql``
        : sql`AND EXTRACT(YEAR FROM cr.launched_at_ts)::int = ANY(${selectedYears})`

    const filteredCampaigns = sql`
      WITH filtered_campaigns AS (
        SELECT
          cr.id AS campaign_id,
          cr.launched_at_ts,
          cr.backers_count,
          cn.normalized_status,
          cn.campaign_duration_days,
          cn.funding_multiple,
          cn.is_fully_researchable,
          cmn.usd_goal,
          cmn.usd_pledged
        FROM subset_memberships sm
        INNER JOIN campaigns_raw cr ON cr.id = sm.campaign_id
        INNER JOIN campaigns_normalized cn ON cn.campaign_id = cr.id
        LEFT JOIN campaign_currency_normalizations cmn ON cmn.campaign_id = cr.id
        WHERE
          sm.subset_key = ${ACTIVE_DATASET_SCOPE}
          AND sm.membership_status <> 'exclude'
          ${searchFilter}
          ${membershipFilter}
          ${confidenceFilter}
          ${categoryFilter}
          ${categoryParentFilter}
          ${rawStateFilter}
          ${durationFilter}
          ${minGoalFilter}
          ${minPledgedFilter}
          ${outcomeFilter}
          ${launchWindowFilter}
          ${minimumBackersFilter}
          ${researchableFilter}
          ${yearFilter}
      ),
      grouped_campaigns AS (
        SELECT
          'all'::text AS dimension_key,
          NULL::int AS taxonomy_node_id,
          'All categories'::text AS taxonomy_label,
          NULL::text AS taxonomy_parent_label,
          fc.*
        FROM filtered_campaigns fc
        UNION ALL
        SELECT
          tn.label AS dimension_key,
          tn.id AS taxonomy_node_id,
          tn.label AS taxonomy_label,
          parent_node.label AS taxonomy_parent_label,
          fc.*
        FROM filtered_campaigns fc
        INNER JOIN campaign_classifications cc ON cc.campaign_id = fc.campaign_id
        INNER JOIN taxonomy_nodes tn ON tn.id = cc.taxonomy_node_id
        LEFT JOIN taxonomy_nodes parent_node ON parent_node.id = tn.parent_id
      ),
      distinct_grouped_campaigns AS (
        SELECT DISTINCT
          gc.dimension_key,
          gc.taxonomy_node_id,
          gc.taxonomy_label,
          gc.taxonomy_parent_label,
          gc.campaign_id,
          gc.launched_at_ts,
          gc.backers_count,
          gc.normalized_status,
          gc.campaign_duration_days,
          gc.funding_multiple,
          gc.is_fully_researchable,
          gc.usd_goal,
          gc.usd_pledged
        FROM grouped_campaigns gc
      )
    `

    return { filteredCampaigns, effectiveWindowStart }
  }
}

async function queryCategoryAnalysisMetrics(
  metricWindow: CategoryAnalysisMetric['metricWindow'],
  inputFilters: DashboardFilters,
) {
  const sql = getSql()

  const { filteredCampaigns, effectiveWindowStart } = buildFilteredCampaignsCte(sql, metricWindow, inputFilters)

    const metricRows = await sql<CategoryAnalysisMetricRow[]>`
      ${filteredCampaigns}
      SELECT
        gc.dimension_key AS "dimensionKey",
        gc.taxonomy_node_id AS "taxonomyNodeId",
        gc.taxonomy_label AS "taxonomyLabel",
        gc.taxonomy_parent_label AS "taxonomyParentLabel",
        ${metricWindow}::text AS "metricWindow",
        ${effectiveWindowStart === null ? null : effectiveWindowStart.toISOString()}::text AS "windowStart",
        ${SNAPSHOT_END.toISOString()}::text AS "windowEnd",
        COUNT(*)::int AS "campaignCount",
        COUNT(*) FILTER (WHERE gc.normalized_status = 'successful')::int AS "successCount",
        COUNT(*) FILTER (WHERE gc.normalized_status = 'unsuccessful')::int AS "failureCount",
        COALESCE(
          ROUND(
            (
              COUNT(*) FILTER (WHERE gc.normalized_status = 'successful')::numeric
              / NULLIF(
                COUNT(*) FILTER (WHERE gc.normalized_status IN ('successful', 'unsuccessful')),
                0
              )
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
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gc.usd_pledged / NULLIF(gc.backers_count, 0))
          FILTER (WHERE gc.usd_pledged IS NOT NULL AND gc.backers_count IS NOT NULL AND gc.backers_count > 0)::float8 AS "medianAveragePledgeUsd",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gc.funding_multiple)
          FILTER (WHERE gc.funding_multiple IS NOT NULL)::float8 AS "medianFundingMultiple",
        COUNT(*) FILTER (WHERE gc.launched_at_ts >= ${RECENT_CUTOFF})::int AS "recentCampaignCount",
        COUNT(*) FILTER (WHERE gc.usd_goal IS NOT NULL AND gc.usd_pledged IS NOT NULL)::int AS "moneyComparableCount",
        '2026-08-12'::text AS "sourceSnapshotVersion",
        'kickstarter-static-usd-v1'::text AS "currencyNormalizationVersion",
        'campaign-classifications-live'::text AS "classificationVersion",
        'reporting-dynamic-v1'::text AS "analysisVersion",
        NOW()::text AS "calculatedAt"
      FROM distinct_grouped_campaigns gc
      GROUP BY
        gc.dimension_key,
        gc.taxonomy_node_id,
        gc.taxonomy_label,
        gc.taxonomy_parent_label
      ORDER BY
        CASE WHEN gc.dimension_key = 'all' THEN 0 ELSE 1 END,
        COUNT(*) DESC,
        gc.taxonomy_label ASC
    `

    const yearRows = await sql<CategoryAnalysisYearRow[]>`
      ${filteredCampaigns}
      SELECT
        gc.dimension_key AS "dimensionKey",
        EXTRACT(YEAR FROM gc.launched_at_ts)::int AS "launchYear",
        COUNT(*)::int AS "campaignCount",
        COUNT(*) FILTER (WHERE gc.normalized_status IN ('successful', 'unsuccessful'))::int AS "completedCount",
        COUNT(*) FILTER (WHERE gc.normalized_status = 'successful')::int AS "successCount",
        COUNT(*) FILTER (WHERE gc.normalized_status = 'unsuccessful')::int AS "failureCount",
        COALESCE(
          ROUND(
            (
              COUNT(*) FILTER (WHERE gc.normalized_status = 'successful')::numeric
              / NULLIF(
                COUNT(*) FILTER (WHERE gc.normalized_status IN ('successful', 'unsuccessful')),
                0
              )
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
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gc.usd_pledged / NULLIF(gc.backers_count, 0))
          FILTER (WHERE gc.usd_pledged IS NOT NULL AND gc.backers_count IS NOT NULL AND gc.backers_count > 0)::float8 AS "medianAveragePledgeUsd",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gc.funding_multiple)
          FILTER (WHERE gc.funding_multiple IS NOT NULL)::float8 AS "medianFundingMultiple",
        COUNT(*) FILTER (WHERE gc.usd_goal IS NOT NULL AND gc.usd_pledged IS NOT NULL)::int AS "moneyComparableCount"
      FROM distinct_grouped_campaigns gc
      WHERE gc.launched_at_ts IS NOT NULL
      GROUP BY
        gc.dimension_key,
        EXTRACT(YEAR FROM gc.launched_at_ts)
      ORDER BY "launchYear" ASC
    `

    const yearsByDimension = new Map<string, Array<Record<string, unknown>>>()

    for (const row of yearRows) {
      const existing = yearsByDimension.get(row.dimensionKey) ?? []
      existing.push({
        launchYear: nullableNumber(row.launchYear),
        campaignCount: nullableNumber(row.campaignCount),
        completedCount: nullableNumber(row.completedCount),
        successCount: nullableNumber(row.successCount),
        failureCount: nullableNumber(row.failureCount),
        successRate: nullableNumber(row.successRate),
        medianGoalUsd: nullableNumber(row.medianGoalUsd),
        medianPledgedUsd: nullableNumber(row.medianPledgedUsd),
        medianBackers: nullableNumber(row.medianBackers),
        medianAveragePledgeUsd: nullableNumber(row.medianAveragePledgeUsd),
        medianFundingMultiple: nullableNumber(row.medianFundingMultiple),
        moneyComparableCount: nullableNumber(row.moneyComparableCount),
      })
      yearsByDimension.set(row.dimensionKey, existing)
    }

    return metricRows.map((row) => mapMetric(row, yearsByDimension.get(row.dimensionKey) ?? []))
}

export async function getCategoryAnalysisMetrics(
  metricWindow: CategoryAnalysisMetric['metricWindow'] = 'all_time',
  filters: DashboardFilters = {},
) {
  if (!hasDatabaseConfig()) return [] as CategoryAnalysisMetric[]

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await queryCategoryAnalysisMetrics(metricWindow, filters)
    } catch (error) {
      if (attempt === 1 || !isTransientDatabaseError(error)) throw error
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  return [] as CategoryAnalysisMetric[]
}
