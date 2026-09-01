import { getSql, hasDatabaseConfig } from './db.ts'
import {
  normalizeResearchText,
  rankResearchCandidates,
  RESEARCH_RANKING_VERSION,
  tokenizeResearchIdea,
  type RankedResearchCandidate,
  type ResearchCandidate,
} from './research-query.ts'

export const RESEARCH_BENCHMARK_VERSION = 'ttrpg-benchmarks-v1'
export const RESEARCH_BENCHMARK_SNAPSHOT = '2026-08-12'

export type ResearchBenchmarkDefinition = {
  key: string
  idea: string
  intent: string
  expectedTaxonomy: string[]
  trustedCampaignIds: number[]
  manualVerdict: 'approved' | 'needs_review'
  reviewNote: string
}

export const RESEARCH_BENCHMARKS: ResearchBenchmarkDefinition[] = [
  {
    key: 'bestiary',
    idea: '5e monster bestiary book',
    intent: 'Find creature compendiums and monster books for 5E play.',
    expectedTaxonomy: ['Bestiaries'],
    trustedCampaignIds: [2859, 480, 1016, 2202],
    manualVerdict: 'approved',
    reviewNote: 'Top results are dominated by explicit bestiary and monster-book campaigns.',
  },
  {
    key: 'dice',
    idea: 'handmade resin dice set',
    intent: 'Find physical resin dice products rather than general tabletop accessories.',
    expectedTaxonomy: ['Dice'],
    trustedCampaignIds: [840, 575, 814],
    manualVerdict: 'approved',
    reviewNote: 'The strongest results explicitly describe resin dice or dice sets.',
  },
  {
    key: 'miniatures',
    idea: '3d printable fantasy miniatures',
    intent: 'Find printable STL miniature campaigns with clear fantasy tabletop use.',
    expectedTaxonomy: ['Miniatures'],
    trustedCampaignIds: [3021, 2869, 559],
    manualVerdict: 'approved',
    reviewNote: 'Title, summary, and Miniatures taxonomy signals align strongly.',
  },
  {
    key: 'virtual-maps',
    idea: 'virtual tabletop battle maps and tokens',
    intent: 'Find digital battle-map and token products suitable for virtual tabletops.',
    expectedTaxonomy: ['Maps', 'VTT', 'VTT Assets', 'Tokens'],
    trustedCampaignIds: [2666, 1444, 2534],
    manualVerdict: 'approved',
    reviewNote: 'Top campaigns contain direct map, token, and virtual-tabletop evidence.',
  },
  {
    key: 'gm-planning',
    idea: 'dungeon master session preparation planner',
    intent: 'Find practical planning, preparation, and organization tools for game masters.',
    expectedTaxonomy: ['DM Tools', 'Preparation', 'Organization'],
    trustedCampaignIds: [227, 1988],
    manualVerdict: 'needs_review',
    reviewNote: 'Results include relevant GM tools, but broad Dungeon Master wording also promotes screens and unrelated products.',
  },
  {
    key: 'audio',
    idea: 'rpg ambient music soundscapes audio',
    intent: 'Find session ambience, music, and soundscape products rather than musicals or audiobooks.',
    expectedTaxonomy: ['Audio'],
    trustedCampaignIds: [2507, 2382, 2082],
    manualVerdict: 'needs_review',
    reviewNote: 'Text matching finds RPG audio, but current Audio classification coverage is too weak in the top results.',
  },
]

type BenchmarkCandidate = ResearchCandidate & {
  description: string | null
}

export type ResearchBenchmarkResult = ResearchBenchmarkDefinition & {
  automaticVerdict: 'pass' | 'warning' | 'fail'
  taxonomyHits: number
  trustedHits: number
  researchableHits: number
  topResults: Array<RankedResearchCandidate<BenchmarkCandidate>>
}

function hasExpectedTaxonomy(
  campaign: ResearchCandidate,
  expectedTaxonomy: string[],
) {
  return expectedTaxonomy.some((label) =>
    campaign.primaryClassificationLabel === label || campaign.taxonomyLabels.includes(label),
  )
}

export function evaluateResearchBenchmark(
  benchmark: ResearchBenchmarkDefinition,
  candidates: BenchmarkCandidate[],
): ResearchBenchmarkResult {
  const terms = tokenizeResearchIdea(benchmark.idea)
  const ranked = rankResearchCandidates(
    candidates.map((candidate) => {
      const normalizedDescription = normalizeResearchText(candidate.description)
      return {
        ...candidate,
        descriptionMatchedTerms: terms.filter((term) => normalizedDescription.includes(term)),
      }
    }),
    { idea: benchmark.idea },
  )
  const topResults = ranked.slice(0, 5)
  const taxonomyHits = topResults.filter((campaign) =>
    hasExpectedTaxonomy(campaign, benchmark.expectedTaxonomy),
  ).length
  const trustedHits = topResults.filter((campaign) =>
    benchmark.trustedCampaignIds.includes(campaign.campaignId),
  ).length
  const researchableHits = topResults.filter((campaign) => campaign.isFullyResearchable).length
  const topResultMatches = topResults[0]
    ? hasExpectedTaxonomy(topResults[0], benchmark.expectedTaxonomy)
    : false
  const automaticVerdict = topResults.length === 0
    ? 'fail'
    : topResultMatches && taxonomyHits >= 3 && trustedHits >= 1
      ? 'pass'
      : taxonomyHits >= 1 || trustedHits >= 1
        ? 'warning'
        : 'fail'

  return {
    ...benchmark,
    automaticVerdict,
    taxonomyHits,
    trustedHits,
    researchableHits,
    topResults,
  }
}

export async function getResearchBenchmarkReport() {
  if (!hasDatabaseConfig()) {
    return {
      configured: false,
      benchmarkVersion: RESEARCH_BENCHMARK_VERSION,
      rankingVersion: RESEARCH_RANKING_VERSION,
      snapshotVersion: RESEARCH_BENCHMARK_SNAPSHOT,
      results: [] as ResearchBenchmarkResult[],
    }
  }

  const sql = getSql()

  const candidates = await sql<BenchmarkCandidate[]>`
      WITH latest_memberships AS (
        SELECT DISTINCT ON (sm.campaign_id)
          sm.campaign_id,
          sm.membership_status
        FROM subset_memberships sm
        WHERE sm.subset_key = 'ttrpg_poc'
        ORDER BY sm.campaign_id, sm.created_at DESC, sm.id DESC
      )
      SELECT
        cr.id::int AS "campaignId",
        cr.project_name AS "projectName",
        cr.project_url AS "projectUrl",
        cr.blurb AS "blurb",
        COALESCE(cr.raw_payload_json->>'description', cr.raw_payload_json->>'story') AS description,
        cr.creator_name AS "creatorName",
        cr.kickstarter_category_name AS "categoryName",
        cr.kickstarter_category_slug AS "categorySlug",
        cr.launched_at_ts::text AS "launchedAt",
        cmn.usd_goal::text AS "goalUsd",
        cmn.usd_pledged::text AS "pledgedUsd",
        cr.backers_count AS "backersCount",
        cn.is_fully_researchable AS "isFullyResearchable",
        cls.primary_label AS "primaryClassificationLabel",
        COALESCE(cls.taxonomy_labels, ARRAY[]::text[]) AS "taxonomyLabels"
      FROM latest_memberships lm
      INNER JOIN campaigns_raw cr ON cr.id = lm.campaign_id
      INNER JOIN campaigns_normalized cn ON cn.campaign_id = cr.id
      LEFT JOIN campaign_currency_normalizations cmn ON cmn.campaign_id = cr.id
      LEFT JOIN LATERAL (
        SELECT
          MAX(CASE WHEN cc.is_primary THEN tn.label END) AS primary_label,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT tn.label ORDER BY tn.label), NULL) AS taxonomy_labels
        FROM campaign_classifications cc
        INNER JOIN taxonomy_nodes tn ON tn.id = cc.taxonomy_node_id
        WHERE cc.campaign_id = cr.id
      ) cls ON true
      WHERE lm.membership_status <> 'exclude'
        AND cn.normalized_status IN ('successful', 'unsuccessful')
    `

    return {
      configured: true,
      benchmarkVersion: RESEARCH_BENCHMARK_VERSION,
      rankingVersion: RESEARCH_RANKING_VERSION,
      snapshotVersion: RESEARCH_BENCHMARK_SNAPSHOT,
      results: RESEARCH_BENCHMARKS.map((benchmark) =>
        evaluateResearchBenchmark(benchmark, candidates),
      ),
    }
}
