import { getSql, hasDatabaseConfig } from '@/lib/db'

export type AdminSubsetSummary = {
  subsetKey: string
  subsetVersion: string
  membershipStatus: string
  confidenceLabel: string | null
  campaignCount: number
}

export type AdminSubsetCampaignRow = {
  campaignId: number
  kickstarterProjectId: number
  projectName: string
  projectUrl: string | null
  blurb: string | null
  categoryName: string | null
  categorySlug: string | null
  creatorName: string | null
  rawState: string | null
  normalizedStatus: string
  campaignDurationDays: number | null
  currency: string | null
  goal: string | null
  pledged: string | null
  goalUsd: string | null
  pledgedUsd: string | null
  backersCount: number | null
  membershipStatus: string
  confidenceLabel: string | null
  subsetKey: string
  subsetVersion: string
  primaryClassificationLabel: string | null
  taxonomyLabels: string[]
}

export type AdminSubsetFilters = {
  search?: string
  membershipStatus?: string
  confidenceLabel?: string
  categorySlug?: string
  durationBucket?: string
  rawState?: string
  minGoal?: string
  minPledged?: string
  sortBy?: string
  sortDir?: string
}

export type AdminClassificationSummary = {
  taxonomyNodes: number
  classifiedCampaigns: number
  classificationRows: number
  primaryClassifications: number
}

const SORT_COLUMN_MAP: Record<string, string> = {
  projectName: 'cr.project_name',
  category: 'cr.kickstarter_category_name',
  state: 'cr.raw_state',
  membership: 'sm.membership_status',
  confidence: 'sm.confidence_label',
  duration: 'cn.campaign_duration_days',
  goal: 'cmn.usd_goal',
  pledged: 'cmn.usd_pledged',
  backers: 'cr.backers_count',
  creator: 'cr.creator_name',
  source: 'cr.project_url',
}

export async function getAdminSubsetOverview(filters: AdminSubsetFilters = {}) {
  if (!hasDatabaseConfig()) {
    return {
      configured: false,
      summary: [] as AdminSubsetSummary[],
      classificationSummary: {
        taxonomyNodes: 0,
        classifiedCampaigns: 0,
        classificationRows: 0,
        primaryClassifications: 0,
      } as AdminClassificationSummary,
      campaigns: [] as AdminSubsetCampaignRow[],
      categories: [] as string[],
      filters,
    }
  }

  const sql = getSql()

  try {
    const summary = await sql<AdminSubsetSummary[]>`
      SELECT
        sm.subset_key AS "subsetKey",
        sm.subset_version AS "subsetVersion",
        sm.membership_status AS "membershipStatus",
        sm.confidence_label AS "confidenceLabel",
        COUNT(*)::int AS "campaignCount"
      FROM subset_memberships sm
      GROUP BY sm.subset_key, sm.subset_version, sm.membership_status, sm.confidence_label
      ORDER BY sm.subset_key, sm.subset_version, sm.membership_status, sm.confidence_label
    `

    const classificationSummaryRows = await sql<AdminClassificationSummary[]>`
      SELECT
        (SELECT COUNT(*)::int FROM taxonomy_nodes WHERE domain_key = 'ttrpg') AS "taxonomyNodes",
        (SELECT COUNT(DISTINCT campaign_id)::int FROM campaign_classifications) AS "classifiedCampaigns",
        (SELECT COUNT(*)::int FROM campaign_classifications) AS "classificationRows",
        (SELECT COUNT(*)::int FROM campaign_classifications WHERE is_primary = true) AS "primaryClassifications"
    `
    const classificationSummary = classificationSummaryRows[0]

    const categoryRows = await sql<{ categorySlug: string | null }[]>`
      SELECT DISTINCT cr.kickstarter_category_slug AS "categorySlug"
      FROM subset_memberships sm
      INNER JOIN campaigns_raw cr ON cr.id = sm.campaign_id
      WHERE cr.kickstarter_category_slug IS NOT NULL
      ORDER BY cr.kickstarter_category_slug ASC
    `

    const search = filters.search?.trim() ?? ''
    const membershipStatus = filters.membershipStatus?.trim() ?? ''
    const confidenceLabel = filters.confidenceLabel?.trim() ?? ''
    const categorySlug = filters.categorySlug?.trim() ?? ''
    const durationBucket = filters.durationBucket?.trim() ?? ''
    const rawState = filters.rawState?.trim() ?? ''
    const minGoal = filters.minGoal?.trim() ?? ''
    const minPledged = filters.minPledged?.trim() ?? ''
    const minGoalValue =
      minGoal !== '' && Number.isFinite(Number(minGoal)) ? Number(minGoal) : null
    const minGoalFilter =
      minGoalValue === null ? sql`` : sql`AND cmn.usd_goal >= ${minGoalValue}`
    const minPledgedValue =
      minPledged !== '' && Number.isFinite(Number(minPledged)) ? Number(minPledged) : null
    const minPledgedFilter =
      minPledgedValue === null ? sql`` : sql`AND cmn.usd_pledged >= ${minPledgedValue}`
    const sortBy =
      filters.sortBy && SORT_COLUMN_MAP[filters.sortBy]
        ? filters.sortBy
        : 'membership'
    const sortDir = filters.sortDir === 'desc' ? 'desc' : 'asc'
    const orderByClause = `${SORT_COLUMN_MAP[sortBy]} ${sortDir.toUpperCase()} NULLS LAST, cr.project_name ASC`

    const campaigns = await sql<AdminSubsetCampaignRow[]>`
      SELECT
        cr.id AS "campaignId",
        cr.kickstarter_project_id AS "kickstarterProjectId",
        cr.project_name AS "projectName",
        cr.project_url AS "projectUrl",
        cr.blurb AS "blurb",
        cr.kickstarter_category_name AS "categoryName",
        cr.kickstarter_category_slug AS "categorySlug",
        cr.creator_name AS "creatorName",
        cr.raw_state AS "rawState",
        cn.normalized_status AS "normalizedStatus",
        cn.campaign_duration_days AS "campaignDurationDays",
        cr.currency AS "currency",
        cr.goal::text AS "goal",
        cr.pledged::text AS "pledged",
        cmn.usd_goal::text AS "goalUsd",
        cmn.usd_pledged::text AS "pledgedUsd",
        cr.backers_count AS "backersCount",
        sm.membership_status AS "membershipStatus",
        sm.confidence_label AS "confidenceLabel",
        sm.subset_key AS "subsetKey",
        sm.subset_version AS "subsetVersion",
        cls.primary_label AS "primaryClassificationLabel",
        COALESCE(cls.taxonomy_labels, ARRAY[]::text[]) AS "taxonomyLabels"
      FROM subset_memberships sm
      INNER JOIN campaigns_raw cr ON cr.id = sm.campaign_id
      INNER JOIN campaigns_normalized cn ON cn.campaign_id = cr.id
      LEFT JOIN campaign_currency_normalizations cmn ON cmn.campaign_id = cr.id
      LEFT JOIN LATERAL (
        SELECT
          MAX(CASE WHEN cc.is_primary THEN tn.label END) AS primary_label,
          ARRAY_REMOVE(
            ARRAY_AGG(DISTINCT tn.label ORDER BY tn.label),
            NULL
          ) AS taxonomy_labels
        FROM campaign_classifications cc
        INNER JOIN taxonomy_nodes tn ON tn.id = cc.taxonomy_node_id
        WHERE cc.campaign_id = cr.id
      ) cls ON true
      WHERE
        (${search} = '' OR (
          cr.project_name ILIKE ${`%${search}%`}
          OR COALESCE(cr.blurb, '') ILIKE ${`%${search}%`}
          OR COALESCE(cr.creator_name, '') ILIKE ${`%${search}%`}
        ))
        AND (${membershipStatus} = '' OR sm.membership_status = ${membershipStatus})
        AND (${confidenceLabel} = '' OR COALESCE(sm.confidence_label, '') = ${confidenceLabel})
        AND (${categorySlug} = '' OR COALESCE(cr.kickstarter_category_slug, '') = ${categorySlug})
        AND (${rawState} = '' OR COALESCE(cr.raw_state, '') = ${rawState})
        ${minGoalFilter}
        ${minPledgedFilter}
        AND (
          ${durationBucket} = ''
          OR (${durationBucket} = 'short' AND cn.campaign_duration_days IS NOT NULL AND cn.campaign_duration_days <= 21)
          OR (${durationBucket} = 'medium' AND cn.campaign_duration_days BETWEEN 22 AND 35)
          OR (${durationBucket} = 'long' AND cn.campaign_duration_days IS NOT NULL AND cn.campaign_duration_days >= 36)
          OR (${durationBucket} = 'unknown' AND cn.campaign_duration_days IS NULL)
        )
      ORDER BY ${sql.unsafe(orderByClause)}
      LIMIT 100
    `

    return {
      configured: true,
      summary,
      classificationSummary,
      campaigns,
      categories: categoryRows
        .map((row) => row.categorySlug)
        .filter((value): value is string => Boolean(value)),
      filters: {
        search,
        membershipStatus,
        confidenceLabel,
        categorySlug,
        durationBucket,
        rawState,
        minGoal: minGoalValue === null ? '' : minGoal,
        minPledged: minPledgedValue === null ? '' : minPledged,
        sortBy,
        sortDir,
      },
    }
  } finally {
    await sql.end()
  }
}
