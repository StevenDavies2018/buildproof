import { getSql, hasDatabaseConfig } from '@/lib/db'

export type CampaignMoney = {
  currency: string | null
  goalRaw: string | null
  pledgedRaw: string | null
  pledgedUsd: string | null
  goalUsd: string | null
  normalizationMode: 'native_usd' | 'static_usd_rate' | 'usd_pledged_ratio' | 'converted_pledged_ratio' | 'unavailable'
  rate: string | null
  rateConfidence: string | null
  snapshotVersion: string | null
}

export type CampaignDetail = {
  campaignId: number
  kickstarterProjectId: number
  projectName: string
  projectUrl: string | null
  blurb: string | null
  description: string | null
  creatorName: string | null
  creatorId: number | null
  categoryName: string | null
  categorySlug: string | null
  parentCategoryName: string | null
  country: string | null
  rawState: string | null
  normalizedStatus: string
  launchedAt: string | null
  deadlineAt: string | null
  campaignDurationDays: number | null
  campaignAgeDays: number | null
  backersCount: number | null
  fundingMultiple: number | null
  averagePledge: string | null
  isFullyResearchable: boolean
  hasProjectUrl: boolean
  sourceUrls: string[]
  membershipStatus: string | null
  confidenceLabel: string | null
  subsetKey: string | null
  subsetVersion: string | null
  primaryClassificationLabel: string | null
  taxonomyLabels: string[]
  money: CampaignMoney
}

export type CompareCampaign = CampaignDetail

type CampaignDetailRow = {
  campaignId: number | string
  kickstarterProjectId: number | string
  projectName: string
  projectUrl: string | null
  blurb: string | null
  description: string | null
  creatorName: string | null
  creatorId: number | null
  categoryName: string | null
  categorySlug: string | null
  parentCategoryName: string | null
  country: string | null
  currency: string | null
  goalRaw: string | null
  pledgedRaw: string | null
  pledgedUsd: string | null
  goalUsd: string | null
  normalizationMode: CampaignMoney['normalizationMode']
  rate: string | null
  rateConfidence: string | null
  snapshotVersion: string | null
  rawState: string | null
  normalizedStatus: string
  launchedAt: string | null
  deadlineAt: string | null
  campaignDurationDays: number | null
  campaignAgeDays: number | null
  backersCount: number | null
  fundingMultiple: number | null
  averagePledge: string | null
  isFullyResearchable: boolean
  hasProjectUrl: boolean
  sourceUrls: unknown
  membershipStatus: string | null
  confidenceLabel: string | null
  subsetKey: string | null
  subsetVersion: string | null
  primaryClassificationLabel: string | null
  taxonomyLabels: string[]
}

function parseSourceUrls(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[]
  }

  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

function mapCampaignDetailRow(row: CampaignDetailRow): CampaignDetail {
  return {
    campaignId: Number(row.campaignId),
    kickstarterProjectId: Number(row.kickstarterProjectId),
    projectName: row.projectName,
    projectUrl: row.projectUrl,
    blurb: row.blurb,
    description: row.description,
    creatorName: row.creatorName,
    creatorId: row.creatorId,
    categoryName: row.categoryName,
    categorySlug: row.categorySlug,
    parentCategoryName: row.parentCategoryName,
    country: row.country,
    rawState: row.rawState,
    normalizedStatus: row.normalizedStatus,
    launchedAt: row.launchedAt,
    deadlineAt: row.deadlineAt,
    campaignDurationDays: row.campaignDurationDays,
    campaignAgeDays: row.campaignAgeDays,
    backersCount: row.backersCount,
    fundingMultiple: row.fundingMultiple,
    averagePledge: row.averagePledge,
    isFullyResearchable: row.isFullyResearchable,
    hasProjectUrl: row.hasProjectUrl,
    sourceUrls: parseSourceUrls(row.sourceUrls),
    membershipStatus: row.membershipStatus,
    confidenceLabel: row.confidenceLabel,
    subsetKey: row.subsetKey,
    subsetVersion: row.subsetVersion,
    primaryClassificationLabel: row.primaryClassificationLabel,
    taxonomyLabels: row.taxonomyLabels ?? [],
    money: {
      currency: row.currency,
      goalRaw: row.goalRaw,
      pledgedRaw: row.pledgedRaw,
      pledgedUsd: row.pledgedUsd,
      goalUsd: row.goalUsd,
      normalizationMode: row.normalizationMode,
      rate: row.rate,
      rateConfidence: row.rateConfidence,
      snapshotVersion: row.snapshotVersion,
    },
  }
}

const DETAIL_SELECT = `
  SELECT
    cr.id AS "campaignId",
    cr.kickstarter_project_id AS "kickstarterProjectId",
    cr.project_name AS "projectName",
    cr.project_url AS "projectUrl",
    cr.blurb AS "blurb",
    COALESCE(
      cr.raw_payload_json->'data'->>'description',
      cr.raw_payload_json->'data'->>'story',
      cr.raw_payload_json->>'description',
      cr.raw_payload_json->>'story'
    ) AS "description",
    cr.creator_name AS "creatorName",
    cr.creator_id AS "creatorId",
    cr.kickstarter_category_name AS "categoryName",
    cr.kickstarter_category_slug AS "categorySlug",
    cr.kickstarter_parent_category_name AS "parentCategoryName",
    cr.country AS "country",
    cr.currency AS "currency",
    cr.goal::text AS "goalRaw",
    cr.pledged::text AS "pledgedRaw",
    cmn.usd_pledged::text AS "pledgedUsd",
    cmn.usd_goal::text AS "goalUsd",
    COALESCE(cmn.rate_source, 'unavailable') AS "normalizationMode",
    cmn.usd_rate::text AS "rate",
    cmn.rate_confidence AS "rateConfidence",
    cmn.source_snapshot_version AS "snapshotVersion",
    cr.raw_state AS "rawState",
    cn.normalized_status AS "normalizedStatus",
    cr.launched_at_ts::text AS "launchedAt",
    cr.deadline_ts::text AS "deadlineAt",
    cn.campaign_duration_days AS "campaignDurationDays",
    cn.campaign_age_days AS "campaignAgeDays",
    cr.backers_count AS "backersCount",
    cn.funding_multiple AS "fundingMultiple",
    cn.average_pledge::text AS "averagePledge",
    cn.is_fully_researchable AS "isFullyResearchable",
    cn.has_project_url AS "hasProjectUrl",
    cr.source_urls_json AS "sourceUrls",
    sm.membership_status AS "membershipStatus",
    sm.confidence_label AS "confidenceLabel",
    sm.subset_key AS "subsetKey",
    sm.subset_version AS "subsetVersion",
    cls.primary_label AS "primaryClassificationLabel",
    COALESCE(cls.taxonomy_labels, ARRAY[]::text[]) AS "taxonomyLabels"
  FROM campaigns_raw cr
  INNER JOIN campaigns_normalized cn ON cn.campaign_id = cr.id
  LEFT JOIN campaign_currency_normalizations cmn ON cmn.campaign_id = cr.id
  LEFT JOIN LATERAL (
    SELECT
      sm1.membership_status,
      sm1.confidence_label,
      sm1.subset_key,
      sm1.subset_version
    FROM subset_memberships sm1
    WHERE sm1.campaign_id = cr.id
    ORDER BY sm1.created_at DESC
    LIMIT 1
  ) sm ON true
  LEFT JOIN LATERAL (
    SELECT
      MAX(CASE WHEN cc.is_primary THEN tn.label END) AS primary_label,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT tn.label ORDER BY tn.label), NULL) AS taxonomy_labels
    FROM campaign_classifications cc
    INNER JOIN taxonomy_nodes tn ON tn.id = cc.taxonomy_node_id
    WHERE cc.campaign_id = cr.id
  ) cls ON true
`

export async function getCampaignDetail(campaignId: number) {
  if (!hasDatabaseConfig()) {
    return null
  }

  const sql = getSql()

  try {
    const rows = await sql.unsafe(`${DETAIL_SELECT} WHERE cr.id = $1 LIMIT 1`, [campaignId]) as CampaignDetailRow[]
    const row = rows[0]
    return row ? mapCampaignDetailRow(row) : null
  } finally {
    await sql.end()
  }
}

export async function getCompareCampaigns(campaignIds: number[]) {
  if (!hasDatabaseConfig() || campaignIds.length === 0) {
    return [] as CompareCampaign[]
  }

  const sql = getSql()

  try {
    const placeholders = campaignIds.map((_, index) => `$${index + 1}`).join(', ')
    const rows = await sql.unsafe(
      `${DETAIL_SELECT} WHERE cr.id IN (${placeholders})`,
      campaignIds,
    ) as CampaignDetailRow[]

    const byId = new Map(
      rows.map((row) => {
        const campaign = mapCampaignDetailRow(row)
        return [campaign.campaignId, campaign]
      }),
    )
    return campaignIds
      .map((id) => byId.get(id))
      .filter((campaign): campaign is CompareCampaign => Boolean(campaign))
  } finally {
    await sql.end()
  }
}
