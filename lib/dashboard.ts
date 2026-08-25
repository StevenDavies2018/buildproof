import { getSql, hasDatabaseConfig } from '@/lib/db'
import {
  RESEARCH_RANKING_VERSION,
  rankResearchCandidates,
  tokenizeResearchIdea,
} from '@/lib/research-query'

const ACTIVE_DATASET_SCOPE = 'full_dataset'

export type DashboardFilters = {
  view?: string
  search?: string
  membershipStatus?: string
  confidenceLabel?: string
  categorySlug?: string
  categoryParent?: string
  taxonomyLabel?: string
  durationBucket?: string
  rawState?: string
  minGoal?: string
  minPledged?: string
  cardLimit?: string
  cardOffset?: string
  sortBy?: string
  sortDir?: string
  years?: string
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
  moneyComparableCount: number
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
  creatorName: string | null
  categoryName: string | null
  categorySlug: string | null
  rawState: string | null
  normalizedStatus: string
  launchedAt: string | null
  campaignDurationDays: number | null
  currency: string | null
  goal: string | null
  pledged: string | null
  pledgedUsd: string | null
  goalUsd: string | null
  moneyRateSource: string | null
  moneyRateConfidence: string | null
  backersCount: number | null
  fundingMultiple: number | null
  isFullyResearchable: boolean
  primaryClassificationLabel: string | null
  taxonomyLabels: string[]
  descriptionMatchedTerms: string[]
  relevanceScore: number
  matchReasons: string[]
  matchedTerms: string[]
}

type DashboardCampaignCandidate = Omit<
  DashboardCampaignRow,
  'relevanceScore' | 'matchReasons' | 'matchedTerms'
>

export type DashboardCategoryRow = {
  categorySlug: string
  categoryParent: string | null
  categoryName: string | null
}

export type DashboardOverview = {
  configured: boolean
  error?: 'database'
  filters: Required<DashboardFilters>
  summary: DashboardSummary
  taxonomy: DashboardTaxonomyRow[]
  trends: DashboardTrendRow[]
  availableYears: number[]
  outcomes: DashboardOutcomeRow[]
  campaigns: DashboardCampaignRow[]
  categories: DashboardCategoryRow[]
  trendDirection: 'rising' | 'steady' | 'softening' | 'insufficient_data'
  rankingVersion: string
  queryTerms: string[]
}

function toRequiredFilters(filters: DashboardFilters): Required<DashboardFilters> {
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

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
    cardLimit: ['12', '24', '48', '100'].includes(filters.cardLimit ?? '')
      ? filters.cardLimit!
      : '12',
    cardOffset: Number.isInteger(Number(filters.cardOffset)) && Number(filters.cardOffset) >= 0
      ? String(Math.floor(Number(filters.cardOffset)))
      : '0',
    sortBy: [
      'recommended',
      'projectName',
      'launchDate',
      'goal',
      'pledged',
      'backers',
      'fundingMultiple',
      'duration',
    ].includes(filters.sortBy ?? '')
      ? filters.sortBy!
      : 'recommended',
    sortDir: filters.sortDir === 'asc' ? 'asc' : 'desc',
    years: text(filters.years),
    launchWindow: text(filters.launchWindow),
    minimumBackers: text(filters.minimumBackers),
    includeFailures:
      filters.includeFailures === 'false' ? 'false' : 'true',
    fullyResearchableOnly:
      filters.fullyResearchableOnly === 'true' ? 'true' : 'false',
  }
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

export type DatasetSnapshotInfo = {
  snapshotVersion: string | null
  importedAt: string | null
}

export async function getLatestDatasetSnapshot(): Promise<DatasetSnapshotInfo> {
  if (!hasDatabaseConfig()) {
    return { snapshotVersion: null, importedAt: null }
  }

  const sql = getSql()

  try {
    const [row] = await sql<DatasetSnapshotInfo[]>`
      SELECT
        snapshot_version AS "snapshotVersion",
        imported_at::text AS "importedAt"
      FROM dataset_imports
      ORDER BY imported_at DESC
      LIMIT 1
    `
    return row ?? { snapshotVersion: null, importedAt: null }
  } catch {
    return { snapshotVersion: null, importedAt: null }
  } finally {
    await sql.end()
  }
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
        moneyComparableCount: 0,
      },
      taxonomy: [],
      trends: [],
      availableYears: [],
      outcomes: [],
      campaigns: [],
      categories: [],
      trendDirection: 'insufficient_data',
      rankingVersion: RESEARCH_RANKING_VERSION,
      queryTerms: tokenizeResearchIdea(filters.search),
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
    const minPledgedValue =
      filters.minPledged !== '' && Number.isFinite(Number(filters.minPledged))
        ? Number(filters.minPledged)
        : null
    const cardLimitValue = Number(filters.cardLimit)
    const cardOffsetValue = Number(filters.cardOffset)
    const searchTerms = tokenizeResearchIdea(filters.search)
    const searchPatterns = searchTerms.flatMap((term) =>
      term === 'dnd'
        ? ['(^|[^a-z0-9])dnd([^a-z0-9]|$)', '(^|[^a-z0-9])d&d([^a-z0-9]|$)']
        : [`(^|[^a-z0-9])${term}([^a-z0-9]|$)`],
    )
    const sortColumnMap: Record<string, string> = {
      projectName: 'cr.project_name',
      launchDate: 'cr.launched_at_ts',
      goal: 'cmn.usd_goal',
      pledged: 'cmn.usd_pledged',
      backers: 'cr.backers_count',
      fundingMultiple: 'cn.funding_multiple',
      duration: 'cn.campaign_duration_days',
    }
    const cardOrderBy =
      filters.sortBy === 'recommended'
        ? 'cn.is_fully_researchable DESC, cr.backers_count DESC NULLS LAST, cr.launched_at_ts DESC NULLS LAST, cr.project_name ASC'
        : `${sortColumnMap[filters.sortBy]} ${filters.sortDir.toUpperCase()} NULLS LAST, cr.project_name ASC`
    const launchWindowStart = resolveLaunchWindowStart(filters.launchWindow)
    const recentCutoff = new Date('2024-08-17T00:00:00Z')
    const selectedYears = Array.from(
      new Set(
        filters.years
          .split(',')
          .map((value) => Number.parseInt(value.trim(), 10))
          .filter((value) => Number.isInteger(value) && value >= 2000 && value <= 2100),
      ),
    ).sort((a, b) => a - b)

    const searchFilter =
      searchPatterns.length === 0
        ? sql``
        : sql`
            AND (
              cr.project_name ~* ANY(${sql.array(searchPatterns)}::text[])
              OR COALESCE(cr.blurb, '') ~* ANY(${sql.array(searchPatterns)}::text[])
              OR COALESCE(cr.creator_name, '') ~* ANY(${sql.array(searchPatterns)}::text[])
              OR COALESCE(cr.kickstarter_category_name, '') ~* ANY(${sql.array(searchPatterns)}::text[])
              OR COALESCE(cr.kickstarter_category_slug, '') ~* ANY(${sql.array(searchPatterns)}::text[])
              OR COALESCE(
                cr.raw_payload_json->'data'->>'description',
                cr.raw_payload_json->'data'->>'story',
                cr.raw_payload_json->>'description',
                cr.raw_payload_json->>'story',
                ''
              )
                ~* ANY(${sql.array(searchPatterns)}::text[])
              OR EXISTS (
                SELECT 1
                FROM campaign_classifications cc_search
                INNER JOIN taxonomy_nodes tn_search ON tn_search.id = cc_search.taxonomy_node_id
                WHERE cc_search.campaign_id = cr.id
                  AND tn_search.label ~* ANY(${sql.array(searchPatterns)}::text[])
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

    const taxonomyFilter =
      filters.taxonomyLabel === ''
        ? sql``
        : sql`
            AND EXISTS (
              SELECT 1
              FROM campaign_classifications cc_filter
              INNER JOIN taxonomy_nodes tn_filter ON tn_filter.id = cc_filter.taxonomy_node_id
              WHERE cc_filter.campaign_id = cr.id
                AND tn_filter.label = ${filters.taxonomyLabel}
            )
          `

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
          ? sql`AND cn.campaign_duration_days BETWEEN 1 AND 15`
          : filters.durationBucket === 'medium'
            ? sql`AND cn.campaign_duration_days BETWEEN 16 AND 30`
            : filters.durationBucket === 'long'
              ? sql`AND cn.campaign_duration_days IS NOT NULL AND cn.campaign_duration_days >= 31`
              : filters.durationBucket === 'unknown'
                ? sql`AND cn.campaign_duration_days IS NULL`
                : sql``

    const minGoalFilter =
      minGoalValue === null ? sql`` : sql`AND cmn.usd_goal >= ${minGoalValue}`
    const minPledgedFilter =
      minPledgedValue === null ? sql`` : sql`AND cmn.usd_pledged >= ${minPledgedValue}`

    const outcomeFilter =
      filters.rawState !== ''
        ? sql``
        : filters.includeFailures === 'false'
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

    const baseWhereWithoutYearAndTaxonomyFilter = sql`
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
    `

    const baseWhereWithoutYearFilter = sql`
      ${baseWhereWithoutYearAndTaxonomyFilter}
      ${taxonomyFilter}
    `

    const yearFilter =
      selectedYears.length === 0
        ? sql``
        : sql`AND EXTRACT(YEAR FROM cr.launched_at_ts)::int = ANY(${selectedYears})`

    const baseWhere = sql`
      ${baseWhereWithoutYearFilter}
      ${yearFilter}
    `

    const categories = await sql<DashboardCategoryRow[]>`
      SELECT DISTINCT
        cr.kickstarter_category_slug AS "categorySlug",
        MAX(cr.kickstarter_parent_category_name) AS "categoryParent",
        MAX(cr.kickstarter_category_name) AS "categoryName"
      FROM subset_memberships sm
      INNER JOIN campaigns_raw cr ON cr.id = sm.campaign_id
      WHERE
        sm.subset_key = ${ACTIVE_DATASET_SCOPE}
        AND sm.membership_status <> 'exclude'
        AND cr.kickstarter_category_slug IS NOT NULL
      GROUP BY cr.kickstarter_category_slug
      ORDER BY MAX(cr.kickstarter_parent_category_name) ASC, MAX(cr.kickstarter_category_name) ASC
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
        COUNT(*) FILTER (WHERE cn.normalized_status IN ('successful', 'unsuccessful'))::int AS "supportedOutcomeCount",
        COUNT(*) FILTER (WHERE cmn.usd_goal IS NOT NULL AND cmn.usd_pledged IS NOT NULL)::int AS "moneyComparableCount"
      FROM subset_memberships sm
      INNER JOIN campaigns_raw cr ON cr.id = sm.campaign_id
      INNER JOIN campaigns_normalized cn ON cn.campaign_id = cr.id
      LEFT JOIN campaign_currency_normalizations cmn ON cmn.campaign_id = cr.id
      ${baseWhere}
    `

    const taxonomy = await sql<DashboardTaxonomyRow[]>`
      SELECT
        labeled.label AS "label",
        COUNT(*)::int AS "campaignCount"
      FROM (
        SELECT DISTINCT
          cr.id,
          tn.label
        FROM subset_memberships sm
        INNER JOIN campaigns_raw cr ON cr.id = sm.campaign_id
        INNER JOIN campaigns_normalized cn ON cn.campaign_id = cr.id
        LEFT JOIN campaign_currency_normalizations cmn ON cmn.campaign_id = cr.id
        INNER JOIN campaign_classifications cc ON cc.campaign_id = cr.id
        INNER JOIN taxonomy_nodes tn ON tn.id = cc.taxonomy_node_id
        ${baseWhereWithoutYearAndTaxonomyFilter}
        ${yearFilter}
      ) AS labeled
      GROUP BY labeled.label
      ORDER BY COUNT(*) DESC, labeled.label ASC
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
      LEFT JOIN campaign_currency_normalizations cmn ON cmn.campaign_id = cr.id
      ${baseWhere}
      AND cr.launched_at_ts IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM cr.launched_at_ts)
      ORDER BY EXTRACT(YEAR FROM cr.launched_at_ts) ASC
    `

    const availableYearRows = await sql<{ launchYear: number }[]>`
      SELECT DISTINCT
        EXTRACT(YEAR FROM cr.launched_at_ts)::int AS "launchYear"
      FROM subset_memberships sm
      INNER JOIN campaigns_raw cr ON cr.id = sm.campaign_id
      INNER JOIN campaigns_normalized cn ON cn.campaign_id = cr.id
      LEFT JOIN campaign_currency_normalizations cmn ON cmn.campaign_id = cr.id
      ${baseWhereWithoutYearAndTaxonomyFilter}
      AND cr.launched_at_ts IS NOT NULL
      ORDER BY "launchYear" ASC
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
      LEFT JOIN campaign_currency_normalizations cmn ON cmn.campaign_id = cr.id
      ${baseWhere}
      AND cn.normalized_status IN ('successful', 'unsuccessful')
      GROUP BY cn.normalized_status
      ORDER BY cn.normalized_status ASC
    `

    const candidateLimit =
      searchTerms.length > 0 && filters.sortBy === 'recommended'
        ? 4000
        : cardLimitValue
    const campaignCandidates = await sql<DashboardCampaignCandidate[]>`
      SELECT
        cr.id AS "campaignId",
        cr.project_name AS "projectName",
        cr.project_url AS "projectUrl",
        cr.blurb AS "blurb",
        cr.creator_name AS "creatorName",
        cr.kickstarter_category_name AS "categoryName",
        cr.kickstarter_category_slug AS "categorySlug",
        cr.raw_state AS "rawState",
        cn.normalized_status AS "normalizedStatus",
        cr.launched_at_ts::text AS "launchedAt",
        cn.campaign_duration_days AS "campaignDurationDays",
        cr.currency AS "currency",
        cr.goal::text AS "goal",
        cr.pledged::text AS "pledged",
        cmn.usd_pledged::text AS "pledgedUsd",
        cmn.usd_goal::text AS "goalUsd",
        cmn.rate_source AS "moneyRateSource",
        cmn.rate_confidence AS "moneyRateConfidence",
        cr.backers_count AS "backersCount",
        cn.funding_multiple AS "fundingMultiple",
        cn.is_fully_researchable AS "isFullyResearchable",
        MAX(CASE WHEN cc.is_primary THEN tn.label END) AS "primaryClassificationLabel",
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT tn.label ORDER BY tn.label), NULL) AS "taxonomyLabels",
        ARRAY(
          SELECT term
          FROM UNNEST(${sql.array(searchTerms)}::text[]) AS term
          WHERE REGEXP_REPLACE(
            LOWER(COALESCE(
              cr.raw_payload_json->'data'->>'description',
              cr.raw_payload_json->'data'->>'story',
              cr.raw_payload_json->>'description',
              cr.raw_payload_json->>'story',
              ''
            )),
            'd\\s*&\\s*d',
            'dnd',
            'g'
          ) ~* ('(^|[^a-z0-9])' || term || '([^a-z0-9]|$)')
          ORDER BY term
        ) AS "descriptionMatchedTerms"
      FROM subset_memberships sm
      INNER JOIN campaigns_raw cr ON cr.id = sm.campaign_id
      INNER JOIN campaigns_normalized cn ON cn.campaign_id = cr.id
      LEFT JOIN campaign_currency_normalizations cmn ON cmn.campaign_id = cr.id
      LEFT JOIN campaign_classifications cc ON cc.campaign_id = cr.id
      LEFT JOIN taxonomy_nodes tn ON tn.id = cc.taxonomy_node_id
      ${baseWhere}
      GROUP BY
        cr.id,
        cr.project_name,
        cr.project_url,
        cr.blurb,
        cr.creator_name,
        cr.kickstarter_category_name,
        cr.kickstarter_category_slug,
        cr.raw_state,
        cn.normalized_status,
        cr.launched_at_ts,
        cn.campaign_duration_days,
        cr.currency,
        cr.goal,
        cr.pledged,
        cmn.usd_pledged,
        cmn.usd_goal,
        cmn.rate_source,
        cmn.rate_confidence,
        cr.backers_count,
        cn.funding_multiple,
        cn.is_fully_researchable
      ORDER BY ${sql.unsafe(cardOrderBy)}
      LIMIT ${candidateLimit}
      OFFSET ${searchTerms.length > 0 && filters.sortBy === 'recommended' ? 0 : cardOffsetValue}
    `

    const rankedCandidates = rankResearchCandidates(campaignCandidates, {
      idea: filters.search,
      categorySlug: filters.categorySlug || undefined,
      taxonomyLabel: filters.taxonomyLabel || undefined,
    })
    const campaigns =
      searchTerms.length > 0 && filters.sortBy === 'recommended'
        ? rankedCandidates.slice(cardOffsetValue, cardOffsetValue + cardLimitValue)
        : campaignCandidates.map((candidate) => {
            const ranked = rankedCandidates.find((row) => row.campaignId === candidate.campaignId)
            return ranked ?? {
              ...candidate,
              relevanceScore: 0,
              matchReasons: [],
              matchedTerms: [],
            }
          })

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
        moneyComparableCount: 0,
      },
      taxonomy,
      trends,
      availableYears: availableYearRows.map((row) => row.launchYear),
      outcomes,
      campaigns,
      categories,
      trendDirection: resolveTrendDirection(trends),
      rankingVersion: RESEARCH_RANKING_VERSION,
      queryTerms: searchTerms,
    }
  } catch {
    return {
      configured: true,
      error: 'database',
      filters,
      summary: {
        comparableCampaigns: 0,
        successRate: null,
        medianSuccessfulBackers: null,
        recentCampaignCount: 0,
        researchableCampaignCount: 0,
        medianSuccessfulFundingMultiple: null,
        supportedOutcomeCount: 0,
        moneyComparableCount: 0,
      },
      taxonomy: [],
      trends: [],
      availableYears: [],
      outcomes: [],
      campaigns: [],
      categories: [],
      trendDirection: 'insufficient_data',
      rankingVersion: RESEARCH_RANKING_VERSION,
      queryTerms: tokenizeResearchIdea(filters.search),
    }
  } finally {
    await sql.end()
  }
}
