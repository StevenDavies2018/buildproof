import { getSql, hasDatabaseConfig } from '@/lib/db'

const POC_SUBSET_KEY = 'ttrpg_poc'

export type DashboardFilters = {
  search?: string
  membershipStatus?: string
  confidenceLabel?: string
  categorySlug?: string
  durationBucket?: string
  rawState?: string
  minGoal?: string
  launchWindow?: string
  minimumBackers?: string
  includeFailures?: string
  fullyResearchableOnly?: string
}

export type DashboardSummary = {
  comparableCampaigns: number
  successRate: number | null
  medianSuccessfulBackers: number | null
  recentCampaignCount: number
  researchableCampaignCount: number
  medianSuccessfulFundingMultiple: number | null
  supportedOutcomeCount: number
}

export type DashboardTaxonomyRow = {
  label: string
  campaignCount: number
}

export type DashboardTrendRow = {
  launchYear: number
  campaignCount: number
  successfulCount: number
  successRate: number | null
}

export type DashboardOutcomeRow = {
  outcome: 'successful' | 'unsuccessful'
  campaignCount: number
  medianBackers: number | null
  medianDurationDays: number | null
  medianFundingMultiple: number | null
  researchableRate: number | null
}

export type DashboardCampaignRow = {
  campaignId: number
  projectName: string
  projectUrl: string | null
  blurb: string | null
  categoryName: string | null
  categorySlug: string | null
  rawState: string | null
  normalizedStatus: string
  launchedAt: string | null
  campaignDurationDays: number | null
  backersCount: number | null
  fundingMultiple: number | null
  isFullyResearchable: boolean
  primaryClassificationLabel: string | null
}

export type DashboardCategoryRow = {
  categorySlug: string
  categoryName: string | null
}

export type DashboardOverview = {
  configured: boolean
  filters: Required<DashboardFilters>
  summary: DashboardSummary
  taxonomy: DashboardTaxonomyRow[]
  trends: DashboardTrendRow[]
  outcomes: DashboardOutcomeRow[]
  campaigns: DashboardCampaignRow[]
  categories: DashboardCategoryRow[]
  trendDirection: 'rising' | 'steady' | 'softening' | 'insufficient_data'
}

function toRequiredFilters(filters: DashboardFilters): Required<DashboardFilters> {
  return {
    search: filters.search?.trim() ?? '',
    membershipStatus: filters.membershipStatus?.trim() ?? '',
    confidenceLabel: filters.confidenceLabel?.trim() ?? '',
    categorySlug: filters.categorySlug?.trim() ?? '',
    durationBucket: filters.durationBucket?.trim() ?? '',
    rawState: filters.rawState?.trim() ?? '',
    minGoal: filters.minGoal?.trim() ?? '',
    launchWindow: filters.launchWindow?.trim() ?? '',
    minimumBackers: filters.minimumBackers?.trim() ?? '',
    includeFailures:
      filters.includeFailures === 'false' ? 'false' : 'true',
    fullyResearchableOnly:
      filters.fullyResearchableOnly === 'true' ? 'true' : 'false',
  }
}

function resolveLaunchWindowStart(launchWindow: string) {
  const now = new Date('2026-08-17T00:00:00Z')

  switch (launchWindow) {
    case '24m':
      return new Date(Date.UTC(now.getUTCFullYear() - 2, now.getUTCMonth(), now.getUTCDate()))
    case '60m':
      return new Date(Date.UTC(now.getUTCFullYear() - 5, now.getUTCMonth(), now.getUTCDate()))
    default:
      return null
  }
}

function resolveTrendDirection(trends: DashboardTrendRow[]) {
  if (trends.length < 4) {
    return 'insufficient_data' as const
  }

  const recentTwo = trends.slice(-2).reduce((sum, row) => sum + row.campaignCount, 0)
  const priorTwo = trends.slice(-4, -2).reduce((sum, row) => sum + row.campaignCount, 0)

  if (priorTwo === 0) {
    return 'insufficient_data' as const
  }

  const ratio = recentTwo / priorTwo
  if (ratio >= 1.15) return 'rising'
  if (ratio <= 0.85) return 'softening'
  return 'steady'
}

export async function getDashboardOverview(
  inputFilters: DashboardFilters = {},
): Promise<DashboardOverview> {
  const filters = toRequiredFilters(inputFilters)

  if (!hasDatabaseConfig()) {
    return {
      configured: false,
      filters,
      summary: {
        comparableCampaigns: 0,
        successRate: null,
        medianSuccessfulBackers: null,
        recentCampaignCount: 0,
        researchableCampaignCount: 0,
        medianSuccessfulFundingMultiple: null,
        supportedOutcomeCount: 0,
      },
      taxonomy: [],
      trends: [],
      outcomes: [],
      campaigns: [],
      categories: [],
      trendDirection: 'insufficient_data',
    }
  }

  const sql = getSql()

  try {
    const minimumBackersValue =
      filters.minimumBackers !== '' && Number.isFinite(Number(filters.minimumBackers))
        ? Number(filters.minimumBackers)
        : null
    const minGoalValue =
      filters.minGoal !== '' && Number.isFinite(Number(filters.minGoal))
        ? Number(filters.minGoal)
        : null
    const launchWindowStart = resolveLaunchWindowStart(filters.launchWindow)
    const recentCutoff = new Date('2024-08-17T00:00:00Z')

    const searchFilter =
      filters.search === ''
        ? sql``
        : sql`
            AND (
              cr.project_name ILIKE ${`%${filters.search}%`}
              OR COALESCE(cr.blurb, '') ILIKE ${`%${filters.search}%`}
              OR COALESCE(cr.creator_name, '') ILIKE ${`%${filters.search}%`}
            )
          `

    const categoryFilter =
      filters.categorySlug === ''
        ? sql``
        : sql`AND COALESCE(cr.kickstarter_category_slug, '') = ${filters.categorySlug}`

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
      filters.durationBucket === ''
        ? sql``
        : filters.durationBucket === 'short'
          ? sql`AND cn.campaign_duration_days IS NOT NULL AND cn.campaign_duration_days <= 21`
          : filters.durationBucket === 'medium'
            ? sql`AND cn.campaign_duration_days BETWEEN 22 AND 35`
            : filters.durationBucket === 'long'
              ? sql`AND cn.campaign_duration_days IS NOT NULL AND cn.campaign_duration_days >= 36`
              : filters.durationBucket === 'unknown'
                ? sql`AND cn.campaign_duration_days IS NULL`
                : sql``

    const minGoalFilter =
      minGoalValue === null ? sql`` : sql`AND cr.goal >= ${minGoalValue}`

    const outcomeFilter =
      filters.includeFailures === 'false'
        ? sql`AND cn.normalized_status = 'successful'`
        : sql`AND cn.normalized_status IN ('successful', 'unsuccessful')`

    const launchWindowFilter =
      launchWindowStart === null
        ? sql``
        : sql`AND cr.launched_at_ts >= ${launchWindowStart}`

    const minimumBackersFilter =
      minimumBackersValue === null
        ? sql``
        : sql`AND COALESCE(cr.backers_count, 0) >= ${minimumBackersValue}`

    const researchableFilter =
      filters.fullyResearchableOnly === 'true'
        ? sql`AND cn.is_fully_researchable = true`
        : sql``

    const baseWhere = sql`
      WHERE
        sm.subset_key = ${POC_SUBSET_KEY}
        AND sm.membership_status <> 'exclude'
        ${searchFilter}
        ${membershipFilter}
        ${confidenceFilter}
        ${categoryFilter}
        ${rawStateFilter}
        ${durationFilter}
        ${minGoalFilter}
        ${outcomeFilter}
        ${launchWindowFilter}
        ${minimumBackersFilter}
        ${researchableFilter}
    `

    const categories = await sql<DashboardCategoryRow[]>`
      SELECT DISTINCT
        cr.kickstarter_category_slug AS "categorySlug",
        MAX(cr.kickstarter_category_name) AS "categoryName"
      FROM subset_memberships sm
      INNER JOIN campaigns_raw cr ON cr.id = sm.campaign_id
      WHERE
        sm.subset_key = ${POC_SUBSET_KEY}
        AND sm.membership_status <> 'exclude'
        AND cr.kickstarter_category_slug IS NOT NULL
      GROUP BY cr.kickstarter_category_slug
      ORDER BY cr.kickstarter_category_slug ASC
    `

    const [summaryRow] = await sql<DashboardSummary[]>`
      SELECT
        COUNT(*)::int AS "comparableCampaigns",
        COALESCE(
          ROUND(
            (
              COUNT(*) FILTER (WHERE cn.normalized_status = 'successful')::numeric
              / NULLIF(
                COUNT(*) FILTER (WHERE cn.normalized_status IN ('successful', 'unsuccessful')),
                0
              )
            ) * 100,
            1
          )::float8,
          NULL
        ) AS "successRate",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cr.backers_count)
          FILTER (
            WHERE cn.normalized_status = 'successful'
            AND cr.backers_count IS NOT NULL
          )::float8 AS "medianSuccessfulBackers",
        COUNT(*) FILTER (WHERE cr.launched_at_ts >= ${recentCutoff})::int AS "recentCampaignCount",
        COUNT(*) FILTER (WHERE cn.is_fully_researchable = true)::int AS "researchableCampaignCount",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cn.funding_multiple)
          FILTER (
            WHERE cn.normalized_status = 'successful'
            AND cn.funding_multiple IS NOT NULL
          )::float8 AS "medianSuccessfulFundingMultiple",
        COUNT(*) FILTER (WHERE cn.normalized_status IN ('successful', 'unsuccessful'))::int AS "supportedOutcomeCount"
      FROM subset_memberships sm
      INNER JOIN campaigns_raw cr ON cr.id = sm.campaign_id
      INNER JOIN campaigns_normalized cn ON cn.campaign_id = cr.id
      ${baseWhere}
    `

    const taxonomy = await sql<DashboardTaxonomyRow[]>`
      SELECT
        tn.label AS "label",
        COUNT(*)::int AS "campaignCount"
      FROM subset_memberships sm
      INNER JOIN campaigns_raw cr ON cr.id = sm.campaign_id
      INNER JOIN campaigns_normalized cn ON cn.campaign_id = cr.id
      INNER JOIN campaign_classifications cc ON cc.campaign_id = cr.id
      INNER JOIN taxonomy_nodes tn ON tn.id = cc.taxonomy_node_id
      ${baseWhere}
      AND cc.is_primary = true
      GROUP BY tn.label
      ORDER BY COUNT(*) DESC, tn.label ASC
      LIMIT 5
    `

    const trends = await sql<DashboardTrendRow[]>`
      SELECT
        EXTRACT(YEAR FROM cr.launched_at_ts)::int AS "launchYear",
        COUNT(*)::int AS "campaignCount",
        COUNT(*) FILTER (WHERE cn.normalized_status = 'successful')::int AS "successfulCount",
        COALESCE(
          ROUND(
            (
              COUNT(*) FILTER (WHERE cn.normalized_status = 'successful')::numeric
              / NULLIF(
                COUNT(*) FILTER (WHERE cn.normalized_status IN ('successful', 'unsuccessful')),
                0
              )
            ) * 100,
            1
          )::float8,
          NULL
        ) AS "successRate"
      FROM subset_memberships sm
      INNER JOIN campaigns_raw cr ON cr.id = sm.campaign_id
      INNER JOIN campaigns_normalized cn ON cn.campaign_id = cr.id
      ${baseWhere}
      AND cr.launched_at_ts IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM cr.launched_at_ts)
      ORDER BY EXTRACT(YEAR FROM cr.launched_at_ts) ASC
    `

    const outcomes = await sql<DashboardOutcomeRow[]>`
      SELECT
        cn.normalized_status AS "outcome",
        COUNT(*)::int AS "campaignCount",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cr.backers_count)
          FILTER (WHERE cr.backers_count IS NOT NULL)::float8 AS "medianBackers",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cn.campaign_duration_days)
          FILTER (WHERE cn.campaign_duration_days IS NOT NULL)::float8 AS "medianDurationDays",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cn.funding_multiple)
          FILTER (WHERE cn.funding_multiple IS NOT NULL)::float8 AS "medianFundingMultiple",
        ROUND(AVG(CASE WHEN cn.is_fully_researchable THEN 1 ELSE 0 END) * 100, 1)::float8 AS "researchableRate"
      FROM subset_memberships sm
      INNER JOIN campaigns_raw cr ON cr.id = sm.campaign_id
      INNER JOIN campaigns_normalized cn ON cn.campaign_id = cr.id
      ${baseWhere}
      AND cn.normalized_status IN ('successful', 'unsuccessful')
      GROUP BY cn.normalized_status
      ORDER BY cn.normalized_status ASC
    `

    const campaigns = await sql<DashboardCampaignRow[]>`
      SELECT
        cr.id AS "campaignId",
        cr.project_name AS "projectName",
        cr.project_url AS "projectUrl",
        cr.blurb AS "blurb",
        cr.kickstarter_category_name AS "categoryName",
        cr.kickstarter_category_slug AS "categorySlug",
        cr.raw_state AS "rawState",
        cn.normalized_status AS "normalizedStatus",
        cr.launched_at_ts::text AS "launchedAt",
        cn.campaign_duration_days AS "campaignDurationDays",
        cr.backers_count AS "backersCount",
        cn.funding_multiple AS "fundingMultiple",
        cn.is_fully_researchable AS "isFullyResearchable",
        MAX(CASE WHEN cc.is_primary THEN tn.label END) AS "primaryClassificationLabel"
      FROM subset_memberships sm
      INNER JOIN campaigns_raw cr ON cr.id = sm.campaign_id
      INNER JOIN campaigns_normalized cn ON cn.campaign_id = cr.id
      LEFT JOIN campaign_classifications cc ON cc.campaign_id = cr.id
      LEFT JOIN taxonomy_nodes tn ON tn.id = cc.taxonomy_node_id
      ${baseWhere}
      GROUP BY
        cr.id,
        cr.project_name,
        cr.project_url,
        cr.blurb,
        cr.kickstarter_category_name,
        cr.kickstarter_category_slug,
        cr.raw_state,
        cn.normalized_status,
        cr.launched_at_ts,
        cn.campaign_duration_days,
        cr.backers_count,
        cn.funding_multiple,
        cn.is_fully_researchable
      ORDER BY
        cn.is_fully_researchable DESC,
        cr.backers_count DESC NULLS LAST,
        cr.launched_at_ts DESC NULLS LAST,
        cr.project_name ASC
      LIMIT 12
    `

    return {
      configured: true,
      filters,
      summary: summaryRow ?? {
        comparableCampaigns: 0,
        successRate: null,
        medianSuccessfulBackers: null,
        recentCampaignCount: 0,
        researchableCampaignCount: 0,
        medianSuccessfulFundingMultiple: null,
        supportedOutcomeCount: 0,
      },
      taxonomy,
      trends,
      outcomes,
      campaigns,
      categories,
      trendDirection: resolveTrendDirection(trends),
    }
  } finally {
    await sql.end()
  }
}
