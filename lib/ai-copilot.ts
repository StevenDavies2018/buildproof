import Anthropic from '@anthropic-ai/sdk'
import { getCategoryAnalysisMetrics, getMetricYearRows } from '@/lib/category-analysis'
import { getDashboardOverview } from '@/lib/dashboard'
import { getSql, hasDatabaseConfig } from '@/lib/db'
import {
  DURATION_BUCKET_LABELS,
  GOAL_BUCKET_LABELS,
  getDurationAnalysisMetrics,
  getGoalSizeAnalysisMetrics,
} from '@/lib/outcome-analysis'
import { getCampaignDetail, getCompareCampaigns } from '@/lib/research'

const MODEL = 'claude-sonnet-4-5'
const MAX_METRIC_ROWS = 20
const MAX_CAMPAIGN_ROWS = 12

export function hasAiCopilotConfig() {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

let cachedClient: Anthropic | null = null

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return cachedClient
}

export type SavedResearchRow = {
  itemKey: string
  itemType: 'research' | 'campaign' | 'comparison'
  label: string
  href: string
  payload: Record<string, unknown>
  snapshotVersion: string
  note: string | null
  savedAt: string
}

// Server-only: intentionally separate from lib/saved-research.ts, which is
// imported by client components and must never pull in the `postgres`
// package.
export async function fetchSavedResearchRowsForUser(userId: number): Promise<SavedResearchRow[]> {
  if (!hasDatabaseConfig()) return []
  const sql = getSql()
  try {
    return await sql<SavedResearchRow[]>`
      SELECT
        item_key AS "itemKey", item_type AS "itemType", label, href,
        payload_json AS payload, snapshot_version AS "snapshotVersion",
        note, saved_at AS "savedAt"
      FROM saved_research_items
      WHERE user_id = ${userId}
      ORDER BY saved_at DESC
    `
  } finally {
    await sql.end()
  }
}

async function fetchSavedResearchRow(userId: number, itemKey: string): Promise<SavedResearchRow | null> {
  if (!hasDatabaseConfig()) return null
  const sql = getSql()
  try {
    const [row] = await sql<SavedResearchRow[]>`
      SELECT
        item_key AS "itemKey", item_type AS "itemType", label, href,
        payload_json AS payload, snapshot_version AS "snapshotVersion",
        note, saved_at AS "savedAt"
      FROM saved_research_items
      WHERE user_id = ${userId} AND item_key = ${itemKey}
      LIMIT 1
    `
    return row ?? null
  } finally {
    await sql.end()
  }
}

function money(value: string | number | null) {
  if (value === null) return 'n/a'
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return 'n/a'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(parsed)
}

// postgres.js returns NUMERIC columns as strings (to avoid float precision
// loss), so fields like campaign.fundingMultiple arrive as strings at
// runtime even though their TS types claim `number` — coerce defensively
// here rather than trusting the declared type, matching the pattern already
// used elsewhere in the app (e.g. formatMultiple() in app/reports/page.tsx).
function toNumber(value: string | number | null) {
  if (value === null) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function percent(value: string | number | null) {
  const parsed = toNumber(value)
  return parsed === null ? 'n/a' : `${parsed.toFixed(1)}%`
}

function multiple(value: string | number | null) {
  const parsed = toNumber(value)
  return parsed === null ? 'n/a' : `${parsed.toFixed(2)}x`
}

type ResolvedContext = {
  contextLines: string[]
  provenanceLine: string
}

async function resolveStructureViewContext(row: SavedResearchRow): Promise<ResolvedContext> {
  const filters = (row.payload as { filters?: Record<string, string> }).filters ?? {}
  const focusLabel = filters.taxonomyLabel?.trim() || 'All categories'
  const baseFilters = { ...filters, taxonomyLabel: '' }

  const [goalMetrics, durationMetrics] = await Promise.all([
    getGoalSizeAnalysisMetrics('all_time', baseFilters),
    getDurationAnalysisMetrics('all_time', baseFilters),
  ])

  const goalLines = goalMetrics
    .filter((row) => row.taxonomyLabel === focusLabel && row.campaignCount > 0)
    .map((row) => (
      `- ${GOAL_BUCKET_LABELS[row.bucketKey] ?? row.bucketKey}: ${row.campaignCount} campaigns, ` +
      `success rate ${percent(row.successRate)}, median funding multiple ${multiple(row.medianFundingMultiple)}, ` +
      `median pledged ${money(row.medianPledgedUsd)}`
    ))
  const durationLines = durationMetrics
    .filter((row) => row.taxonomyLabel === focusLabel && row.campaignCount > 0)
    .map((row) => (
      `- ${DURATION_BUCKET_LABELS[row.bucketKey] ?? row.bucketKey}: ${row.campaignCount} campaigns, ` +
      `success rate ${percent(row.successRate)}, median funding multiple ${multiple(row.medianFundingMultiple)}, ` +
      `median pledged ${money(row.medianPledgedUsd)}`
    ))

  return {
    contextLines: [
      `Structure analysis for: ${focusLabel}.`,
      goalLines.length
        ? 'Outcomes grouped by initial funding goal size (same underlying campaigns, bucketed by goal, not filtered by it):'
        : 'No goal-size buckets had enough campaigns for this slice.',
      ...goalLines,
      durationLines.length
        ? 'Outcomes grouped by campaign duration (same underlying campaigns, bucketed by duration, not filtered by it):'
        : 'No duration buckets had enough campaigns for this slice.',
      ...durationLines,
    ],
    provenanceLine: `Snapshot version tied to filters: ${row.snapshotVersion}. These are grouped counts and medians, not a model-inferred pattern.`,
  }
}

async function resolveResearchViewContext(row: SavedResearchRow): Promise<ResolvedContext> {
  const filters = (row.payload as { filters?: Record<string, string> }).filters ?? {}

  if (row.href.startsWith('/reports/structure')) {
    return resolveStructureViewContext(row)
  }

  if (row.href.startsWith('/reports')) {
    const metricWindow = filters.window === 'last_24_months' ? 'last_24_months' : 'all_time'
    const metrics = await getCategoryAnalysisMetrics(metricWindow, filters)
    const rows = metrics.filter((metric) => metric.dimensionKey !== 'all').slice(0, MAX_METRIC_ROWS)

    const lines = rows.map((metric) => (
      `- ${metric.taxonomyLabel}: ${metric.campaignCount} campaigns (${metric.recentCampaignCount} in the recent window), ` +
      `success rate ${percent(metric.successRate)}, ` +
      `median goal ${money(metric.medianGoalUsd)}, ` +
      `median funding multiple ${multiple(metric.medianFundingMultiple)}, ` +
      `trend ${metric.trendLabel}, ` +
      `${metric.moneyComparableCount} of ${metric.campaignCount} campaigns have comparable normalized money data`
    ))

    // When the saved view is drilled into one specific category (not the
    // multi-category roster), also surface its full year-by-year breakdown
    // so the model can speak to trend direction, not just a single-window
    // snapshot.
    const selectedTaxonomyLabel = filters.taxonomyLabel?.trim()
    const selectedMetric = selectedTaxonomyLabel
      ? rows.find((metric) => metric.taxonomyLabel.toLowerCase() === selectedTaxonomyLabel.toLowerCase())
      : null
    const yearRows = selectedMetric ? getMetricYearRows(selectedMetric) : []
    const yearLines = yearRows.map((year) => (
      `- ${year.launchYear}: ${year.campaignCount} campaigns, success rate ${percent(year.successRate)}, ` +
      `median goal ${money(year.medianGoalUsd)}, median funding multiple ${multiple(year.medianFundingMultiple)}`
    ))

    return {
      contextLines: [
        `Reporting slice: ${metricWindow === 'last_24_months' ? 'campaigns launched in the trailing 24 months' : 'all available campaign history'}.`,
        rows.length ? 'Category rows, one per taxonomy label:' : 'No category rows matched this filter combination.',
        ...lines,
        ...(yearLines.length
          ? [`Year-by-year breakdown for ${selectedMetric?.taxonomyLabel}:`, ...yearLines]
          : []),
      ],
      provenanceLine: rows[0]
        ? `Snapshot ${rows[0].sourceSnapshotVersion ?? 'unknown'}, calculated ${rows[0].calculatedAt}, currency normalization ${rows[0].currencyNormalizationVersion ?? 'unknown'}.`
        : 'No snapshot metadata available for this slice.',
    }
  }

  const overview = await getDashboardOverview(filters)
  const campaignLines = overview.campaigns.slice(0, MAX_CAMPAIGN_ROWS).map((campaign) => (
    `- ${campaign.projectName} (${campaign.normalizedStatus}): goal ${money(campaign.goalUsd)}, ` +
    `pledged ${money(campaign.pledgedUsd)}, backers ${campaign.backersCount ?? 'n/a'}, ` +
    `funding multiple ${multiple(campaign.fundingMultiple)}, ` +
    `duration ${campaign.campaignDurationDays ?? 'n/a'} days`
  ))
  const trendLines = overview.trends.map((year) => (
    `- ${year.launchYear}: ${year.campaignCount} campaigns launched, ${year.successfulCount} successful, ` +
    `success rate ${percent(year.successRate)}`
  ))

  return {
    contextLines: [
      `Dashboard slice summary: ${overview.summary.comparableCampaigns} comparable campaigns, ` +
      `success rate ${percent(overview.summary.successRate)}, ` +
      `median successful backers ${overview.summary.medianSuccessfulBackers ?? 'n/a'}, ` +
      `median successful funding multiple ${multiple(overview.summary.medianSuccessfulFundingMultiple)}, ` +
      `${overview.summary.moneyComparableCount} campaigns have comparable normalized money data. ` +
      `Overall trend direction: ${overview.trendDirection}.`,
      campaignLines.length ? `Sample of matching campaigns (up to ${MAX_CAMPAIGN_ROWS}):` : 'No individual campaigns matched this filter combination.',
      ...campaignLines,
      trendLines.length ? 'Year-by-year launch volume and success rate:' : 'No year-by-year breakdown is available for this slice.',
      ...trendLines,
    ],
    provenanceLine: `Snapshot version tied to filters: ${row.snapshotVersion}.`,
  }
}

async function resolveCampaignContext(row: SavedResearchRow): Promise<ResolvedContext> {
  const campaignId = Number((row.payload as { campaignId?: number }).campaignId)
  const campaign = Number.isFinite(campaignId) ? await getCampaignDetail(campaignId) : null

  if (!campaign) {
    return {
      contextLines: ['This saved campaign could not be found in the current dataset snapshot.'],
      provenanceLine: `Snapshot version tied to save: ${row.snapshotVersion}.`,
    }
  }

  return {
    contextLines: [
      `Campaign: ${campaign.projectName} (${campaign.normalizedStatus}).`,
      `Category: ${campaign.primaryClassificationLabel ?? campaign.categoryName ?? 'unclassified'}.`,
      `Goal: ${money(campaign.money.goalUsd)}, pledged: ${money(campaign.money.pledgedUsd)}, ` +
      `backers: ${campaign.backersCount ?? 'n/a'}, funding multiple: ${multiple(campaign.fundingMultiple)}.`,
      `Duration: ${campaign.campaignDurationDays ?? 'n/a'} days. Launched: ${campaign.launchedAt ?? 'unknown'}.`,
      `Fully researchable: ${campaign.isFullyResearchable ? 'yes' : 'no'}. ` +
      `Money normalization confidence: ${campaign.money.rateConfidence ?? 'unknown'}.`,
    ],
    provenanceLine: `Money normalization snapshot ${campaign.money.snapshotVersion ?? 'unknown'}.`,
  }
}

async function resolveComparisonContext(row: SavedResearchRow): Promise<ResolvedContext> {
  const rawIds = (row.payload as { campaignIds?: unknown }).campaignIds
  const campaignIds = Array.isArray(rawIds) ? rawIds.map((id) => Number(id)).filter((id) => Number.isFinite(id)) : []
  const campaigns = await getCompareCampaigns(campaignIds)

  if (!campaigns.length) {
    return {
      contextLines: ['None of the campaigns in this saved comparison could be found in the current dataset snapshot.'],
      provenanceLine: `Snapshot version tied to save: ${row.snapshotVersion}.`,
    }
  }

  const lines = campaigns.map((campaign) => (
    `- ${campaign.projectName} (${campaign.normalizedStatus}): goal ${money(campaign.money.goalUsd)}, ` +
    `pledged ${money(campaign.money.pledgedUsd)}, backers ${campaign.backersCount ?? 'n/a'}, ` +
    `funding multiple ${multiple(campaign.fundingMultiple)}, duration ${campaign.campaignDurationDays ?? 'n/a'} days, ` +
    `category ${campaign.primaryClassificationLabel ?? campaign.categoryName ?? 'unclassified'}`
  ))

  return {
    contextLines: [`Comparison of ${campaigns.length} saved campaigns:`, ...lines],
    provenanceLine: `Money normalization snapshots: ${Array.from(new Set(campaigns.map((c) => c.money.snapshotVersion ?? 'unknown'))).join(', ')}.`,
  }
}

const SYSTEM_PROMPT = `You are Backer Sonar's AI Co-Pilot, an optional interpretation layer over deterministic historical Kickstarter research data.

Rules you must follow:
1. Only reference the concrete numbers given to you in the CONTEXT section below. Never invent a statistic, campaign, category, or trend that is not present there.
2. Do not predict whether any future campaign will succeed. Do not assign a success likelihood or hidden score to anything.
3. Do not tell the user what they "should" build or where they "should" launch. Describe what the historical evidence shows and let the user draw their own conclusion.
4. If a sample size is small, a confidence label is low, or money-comparable coverage is partial, say so explicitly rather than treating the numbers as fully reliable.
5. Keep your response to a few short paragraphs or a short bulleted list. Reference specific numbers from the context, not vague language like "many" or "strong."
6. Begin your response with the words "AI-generated interpretation:" on its own line, so it is never mistaken for source evidence.`

export async function generateCoPilotBrief(userId: number, itemKey: string) {
  if (!hasAiCopilotConfig()) throw new Error('AI Co-Pilot is not configured')

  const row = await fetchSavedResearchRow(userId, itemKey)
  if (!row) throw new Error('Saved item not found')

  const resolved =
    row.itemType === 'research'
      ? await resolveResearchViewContext(row)
      : row.itemType === 'campaign'
        ? await resolveCampaignContext(row)
        : await resolveComparisonContext(row)

  const contextText = [
    `Saved item: "${row.label}" (${row.itemType}), saved ${row.savedAt}.`,
    ...resolved.contextLines,
    resolved.provenanceLine,
  ].join('\n')

  const client = getClient()
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `CONTEXT:\n${contextText}\n\nSummarize this saved research for me, calling out anything worth a closer look.`,
      },
    ],
  })

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()

  return {
    text: text || 'AI-generated interpretation: no response was returned.',
    generatedAt: new Date().toISOString(),
    sourceItemLabel: row.label,
    sourceItemType: row.itemType,
  }
}
