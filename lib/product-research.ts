import { getSql, hasDatabaseConfig } from '@/lib/db'
import {
  type ResearchCandidate,
  rankResearchCandidates,
  tokenizeResearchIdea,
} from '@/lib/research-query'

const ACTIVE_DATASET_SCOPE = 'full_dataset'
const LOOKBACK_YEARS = 5
const CANDIDATE_LIMIT = 3000
const TOP_CAMPAIGN_LIMIT = 12
const REPEAT_CREATOR_LIMIT = 8

type RawCandidateRow = ResearchCandidate & {
  creatorId: number | null
  normalizedStatus: string
}

export type ProductResearchCampaign = {
  campaignId: number
  projectName: string
  projectUrl: string | null
  creatorName: string | null
  normalizedStatus: string
  launchedAt: string | null
  goalUsd: number | null
  pledgedUsd: number | null
  backersCount: number | null
  relevanceScore: number
}

export type ProductResearchOutcomeStats = {
  count: number
  medianPledgedUsd: number | null
  avgPledgedUsd: number | null
  medianBackers: number | null
  avgGoalUsd: number | null
}

export type ProductResearchRepeatCreator = {
  creatorName: string
  campaignCount: number
  totalPledgedUsd: number | null
  campaignNames: string[]
}

export type ProductResearchLaunchYear = {
  launchYear: number
  campaignCount: number
}

export type ProductResearchResult = {
  configured: boolean
  idea: string
  excludeTerms: string[]
  searchTerms: string[]
  lookbackYears: number
  totalMatches: number
  successfulCount: number
  unsuccessfulCount: number
  otherStatusCount: number
  successRate: number | null
  evidenceFor: ProductResearchOutcomeStats
  evidenceAgainst: ProductResearchOutcomeStats
  launchFrequency: ProductResearchLaunchYear[]
  repeatCreators: ProductResearchRepeatCreator[]
  topSuccessfulCampaigns: ProductResearchCampaign[]
  topUnsuccessfulCampaigns: ProductResearchCampaign[]
}

function toNumber(value: string | number | null): number | null {
  if (value === null) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function average(values: number[]): number | null {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function outcomeStats(rows: RawCandidateRow[]): ProductResearchOutcomeStats {
  const pledged = rows.map((row) => toNumber(row.pledgedUsd)).filter((value): value is number => value !== null)
  const backers = rows.map((row) => row.backersCount).filter((value): value is number => value !== null)
  const goals = rows.map((row) => toNumber(row.goalUsd)).filter((value): value is number => value !== null)

  return {
    count: rows.length,
    medianPledgedUsd: median(pledged),
    avgPledgedUsd: average(pledged),
    medianBackers: median(backers),
    avgGoalUsd: average(goals),
  }
}

function buildSearchPatterns(terms: string[]) {
  return terms.flatMap((term) =>
    term === 'dnd'
      ? ['(^|[^a-z0-9])dnd([^a-z0-9]|$)', '(^|[^a-z0-9])d&d([^a-z0-9]|$)']
      : [`(^|[^a-z0-9])${term}([^a-z0-9]|$)`],
  )
}

const EMPTY_RESULT_BASE = {
  successfulCount: 0,
  unsuccessfulCount: 0,
  otherStatusCount: 0,
  successRate: null,
  evidenceFor: { count: 0, medianPledgedUsd: null, avgPledgedUsd: null, medianBackers: null, avgGoalUsd: null },
  evidenceAgainst: { count: 0, medianPledgedUsd: null, avgPledgedUsd: null, medianBackers: null, avgGoalUsd: null },
  launchFrequency: [] as ProductResearchLaunchYear[],
  repeatCreators: [] as ProductResearchRepeatCreator[],
  topSuccessfulCampaigns: [] as ProductResearchCampaign[],
  topUnsuccessfulCampaigns: [] as ProductResearchCampaign[],
}

export async function researchProductConcept(
  idea: string,
  excludeTerms: string[] = [],
): Promise<ProductResearchResult> {
  const searchTerms = tokenizeResearchIdea(idea)
  const normalizedExcludeTerms = Array.from(
    new Set(
      excludeTerms
        .map((term) => term.trim().toLowerCase())
        .filter((term) => term.length >= 2),
    ),
  )

  if (!hasDatabaseConfig() || searchTerms.length === 0) {
    return {
      configured: hasDatabaseConfig(),
      idea,
      excludeTerms: normalizedExcludeTerms,
      searchTerms,
      lookbackYears: LOOKBACK_YEARS,
      totalMatches: 0,
      ...EMPTY_RESULT_BASE,
    }
  }

  const sql = getSql()

  const searchPatterns = buildSearchPatterns(searchTerms)
    const excludePatterns = buildSearchPatterns(normalizedExcludeTerms)
    const lookbackStart = new Date()
    lookbackStart.setUTCFullYear(lookbackStart.getUTCFullYear() - LOOKBACK_YEARS)

    const excludeFilter =
      excludePatterns.length === 0
        ? sql``
        : sql`
            AND NOT (
              cr.project_name ~* ANY(${excludePatterns}::text[])
              OR COALESCE(cr.blurb, '') ~* ANY(${excludePatterns}::text[])
              OR COALESCE(
                cr.raw_payload_json->'data'->>'description',
                cr.raw_payload_json->'data'->>'story',
                cr.raw_payload_json->>'description',
                cr.raw_payload_json->>'story',
                ''
              ) ~* ANY(${excludePatterns}::text[])
            )
          `

    const rows = await sql<RawCandidateRow[]>`
      SELECT
        cr.id AS "campaignId",
        cr.project_name AS "projectName",
        cr.project_url AS "projectUrl",
        cr.blurb AS "blurb",
        cr.creator_id AS "creatorId",
        cr.creator_name AS "creatorName",
        cr.kickstarter_category_name AS "categoryName",
        cr.kickstarter_category_slug AS "categorySlug",
        cr.launched_at_ts::text AS "launchedAt",
        cn.normalized_status AS "normalizedStatus",
        cn.is_fully_researchable AS "isFullyResearchable",
        cr.backers_count AS "backersCount",
        cmn.usd_goal::text AS "goalUsd",
        cmn.usd_pledged::text AS "pledgedUsd"
      FROM subset_memberships sm
      INNER JOIN campaigns_raw cr ON cr.id = sm.campaign_id
      INNER JOIN campaigns_normalized cn ON cn.campaign_id = cr.id
      LEFT JOIN campaign_currency_normalizations cmn ON cmn.campaign_id = cr.id
      WHERE
        sm.subset_key = ${ACTIVE_DATASET_SCOPE}
        AND sm.membership_status <> 'exclude'
        AND cr.launched_at_ts >= ${lookbackStart}
        AND (
          cr.project_name ~* ANY(${searchPatterns}::text[])
          OR COALESCE(cr.blurb, '') ~* ANY(${searchPatterns}::text[])
          OR COALESCE(cr.creator_name, '') ~* ANY(${searchPatterns}::text[])
          OR COALESCE(cr.kickstarter_category_name, '') ~* ANY(${searchPatterns}::text[])
          OR COALESCE(
            cr.raw_payload_json->'data'->>'description',
            cr.raw_payload_json->'data'->>'story',
            cr.raw_payload_json->>'description',
            cr.raw_payload_json->>'story',
            ''
          ) ~* ANY(${searchPatterns}::text[])
        )
        ${excludeFilter}
      LIMIT ${CANDIDATE_LIMIT}
    `

    if (rows.length === 0) {
      return {
        configured: true,
        idea,
        excludeTerms: normalizedExcludeTerms,
        searchTerms,
        lookbackYears: LOOKBACK_YEARS,
        totalMatches: 0,
        ...EMPTY_RESULT_BASE,
      }
    }

    const ranked = rankResearchCandidates(
      rows.map((row) => ({ ...row, primaryClassificationLabel: null, taxonomyLabels: [] })),
      { idea },
    )

    const successful = rows.filter((row) => row.normalizedStatus === 'successful')
    const unsuccessful = rows.filter((row) => row.normalizedStatus === 'unsuccessful')
    const otherStatusCount = rows.length - successful.length - unsuccessful.length
    const supportedOutcomeCount = successful.length + unsuccessful.length

    const launchFrequencyMap = new Map<number, number>()
    for (const row of rows) {
      if (!row.launchedAt) continue
      const year = new Date(row.launchedAt).getUTCFullYear()
      if (!Number.isFinite(year)) continue
      launchFrequencyMap.set(year, (launchFrequencyMap.get(year) ?? 0) + 1)
    }
    const launchFrequency = Array.from(launchFrequencyMap.entries())
      .map(([launchYear, campaignCount]) => ({ launchYear, campaignCount }))
      .sort((a, b) => a.launchYear - b.launchYear)

    const creatorGroups = new Map<number, RawCandidateRow[]>()
    for (const row of rows) {
      if (row.creatorId === null) continue
      const group = creatorGroups.get(row.creatorId) ?? []
      group.push(row)
      creatorGroups.set(row.creatorId, group)
    }
    const repeatCreators = Array.from(creatorGroups.values())
      .filter((group) => group.length > 1)
      .map((group) => ({
        creatorName: group[0].creatorName ?? 'Unknown creator',
        campaignCount: group.length,
        totalPledgedUsd: group.reduce((sum, row) => sum + (toNumber(row.pledgedUsd) ?? 0), 0),
        campaignNames: group.map((row) => row.projectName),
      }))
      .sort((a, b) => b.campaignCount - a.campaignCount)
      .slice(0, REPEAT_CREATOR_LIMIT)

    const toCampaign = (row: (typeof ranked)[number]): ProductResearchCampaign => {
      return {
        campaignId: row.campaignId,
        projectName: row.projectName,
        projectUrl: row.projectUrl,
        creatorName: row.creatorName,
        normalizedStatus: row.normalizedStatus,
        launchedAt: row.launchedAt,
        goalUsd: toNumber(row.goalUsd),
        pledgedUsd: toNumber(row.pledgedUsd),
        backersCount: row.backersCount,
        relevanceScore: row.relevanceScore,
      }
    }

    const topSuccessfulCampaigns = ranked
      .filter((row) => row.normalizedStatus === 'successful')
      .slice(0, TOP_CAMPAIGN_LIMIT)
      .map(toCampaign)
    const topUnsuccessfulCampaigns = ranked
      .filter((row) => row.normalizedStatus === 'unsuccessful')
      .slice(0, TOP_CAMPAIGN_LIMIT)
      .map(toCampaign)

    return {
      configured: true,
      idea,
      excludeTerms: normalizedExcludeTerms,
      searchTerms,
      lookbackYears: LOOKBACK_YEARS,
      totalMatches: rows.length,
      successfulCount: successful.length,
      unsuccessfulCount: unsuccessful.length,
      otherStatusCount,
      successRate: supportedOutcomeCount > 0 ? (successful.length / supportedOutcomeCount) * 100 : null,
      evidenceFor: outcomeStats(successful),
      evidenceAgainst: outcomeStats(unsuccessful),
      launchFrequency,
      repeatCreators,
      topSuccessfulCampaigns,
      topUnsuccessfulCampaigns,
    }
}
