export const CATEGORY_ANALYSIS_VERSION = 'category-metrics-v1'
export const CATEGORY_ANALYSIS_SNAPSHOT_DATE = '2026-08-12T23:59:59.999Z'

function numeric(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function median(values) {
  const sorted = values
    .map(numeric)
    .filter((value) => value !== null)
    .sort((left, right) => left - right)

  if (!sorted.length) return null
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function subtractMonths(date, months) {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() - months,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  ))
}

function toDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? null : date
}

function buildYearDetails(campaigns) {
  const byYear = new Map()
  for (const campaign of campaigns) {
    const launchedAt = toDate(campaign.launched_at)
    if (!launchedAt) continue
    const year = launchedAt.getUTCFullYear()
    const current = byYear.get(year) ?? {
      campaignCount: 0,
      completedCount: 0,
      successCount: 0,
    }
    current.campaignCount += 1
    if (['successful', 'unsuccessful'].includes(campaign.normalized_status)) {
      current.completedCount += 1
      if (campaign.normalized_status === 'successful') current.successCount += 1
    }
    byYear.set(year, current)
  }

  return Array.from(byYear.entries())
    .sort(([left], [right]) => left - right)
    .map(([launchYear, counts]) => ({
      launchYear,
      campaignCount: counts.campaignCount,
      completedCount: counts.completedCount,
      successCount: counts.successCount,
      successRate:
        counts.completedCount > 0
          ? Number(((counts.successCount / counts.completedCount) * 100).toFixed(1))
          : null,
    }))
}

function buildTrend(campaigns, snapshotDate) {
  const recentStart = subtractMonths(snapshotDate, 24)
  const priorStart = subtractMonths(snapshotDate, 48)
  let recentCount = 0
  let priorCount = 0

  for (const campaign of campaigns) {
    const launchedAt = toDate(campaign.launched_at)
    if (!launchedAt || launchedAt > snapshotDate) continue
    if (launchedAt >= recentStart) recentCount += 1
    else if (launchedAt >= priorStart) priorCount += 1
  }

  const ratio = priorCount > 0 ? recentCount / priorCount : null
  const label =
    ratio === null
      ? 'insufficient_data'
      : ratio >= 1.15
        ? 'rising'
        : ratio <= 0.85
          ? 'softening'
          : 'steady'

  return {
    label,
    recentCount,
    priorCount,
    ratio: ratio === null ? null : Number(ratio.toFixed(4)),
    recentStart: recentStart.toISOString(),
    priorStart: priorStart.toISOString(),
    periodEnd: snapshotDate.toISOString(),
  }
}

function aggregateDimension(campaigns, options) {
  const { metricWindow, windowStart, snapshotDate, trend } = options
  const inWindow = campaigns.filter((campaign) => {
    const launchedAt = toDate(campaign.launched_at)
    if (launchedAt && launchedAt > snapshotDate) return false
    return !windowStart || (launchedAt !== null && launchedAt >= windowStart)
  })
  const completed = inWindow.filter((campaign) =>
    ['successful', 'unsuccessful'].includes(campaign.normalized_status),
  )
  const successCount = completed.filter(
    (campaign) => campaign.normalized_status === 'successful',
  ).length
  const failureCount = completed.length - successCount
  const recentStart = subtractMonths(snapshotDate, 24)

  const averagePledgesUsd = inWindow.map((campaign) => {
    const pledgedUsd = numeric(campaign.usd_pledged)
    const backers = numeric(campaign.backers_count)
    return pledgedUsd !== null && backers !== null && backers > 0
      ? pledgedUsd / backers
      : null
  })

  return {
    metricWindow,
    windowStart,
    windowEnd: snapshotDate,
    campaignCount: inWindow.length,
    successCount,
    failureCount,
    successRate:
      completed.length > 0
        ? Number(((successCount / completed.length) * 100).toFixed(4))
        : null,
    medianGoalUsd: median(inWindow.map((campaign) => campaign.usd_goal)),
    medianPledgedUsd: median(inWindow.map((campaign) => campaign.usd_pledged)),
    medianBackers: median(inWindow.map((campaign) => campaign.backers_count)),
    medianAveragePledgeUsd: median(averagePledgesUsd),
    medianFundingMultiple: median(inWindow.map((campaign) => campaign.funding_multiple)),
    recentCampaignCount: inWindow.filter((campaign) => {
      const launchedAt = toDate(campaign.launched_at)
      return launchedAt !== null && launchedAt >= recentStart && launchedAt <= snapshotDate
    }).length,
    moneyComparableCount: inWindow.filter(
      (campaign) => numeric(campaign.usd_goal) !== null && numeric(campaign.usd_pledged) !== null,
    ).length,
    trendLabel: trend.label,
    trendDetails: {
      method: 'trailing_24_months_vs_previous_24_months',
      periods: trend,
      years: buildYearDetails(inWindow),
    },
  }
}

export function buildCategoryAnalysisRows(campaigns, snapshotValue = CATEGORY_ANALYSIS_SNAPSHOT_DATE) {
  const snapshotDate = new Date(snapshotValue)
  if (Number.isNaN(snapshotDate.valueOf())) throw new Error('Invalid analysis snapshot date')

  const dimensions = new Map()
  dimensions.set('all', {
    dimensionKey: 'all',
    taxonomyNodeId: null,
    taxonomyLabel: 'All TTRPG',
    campaigns: [],
  })

  for (const campaign of campaigns) {
    dimensions.get('all').campaigns.push(campaign)
    if (!campaign.taxonomy_node_id) continue
    const dimensionKey = `taxonomy:${campaign.taxonomy_node_id}`
    if (!dimensions.has(dimensionKey)) {
      dimensions.set(dimensionKey, {
        dimensionKey,
        taxonomyNodeId: Number(campaign.taxonomy_node_id),
        taxonomyLabel: campaign.taxonomy_label,
        campaigns: [],
      })
    }
    dimensions.get(dimensionKey).campaigns.push(campaign)
  }

  const windows = [
    { metricWindow: 'all_time', windowStart: null },
    { metricWindow: 'last_24_months', windowStart: subtractMonths(snapshotDate, 24) },
  ]
  const output = []

  for (const dimension of dimensions.values()) {
    const trend = buildTrend(dimension.campaigns, snapshotDate)
    for (const window of windows) {
      output.push({
        dimensionKey: dimension.dimensionKey,
        taxonomyNodeId: dimension.taxonomyNodeId,
        taxonomyLabel: dimension.taxonomyLabel,
        ...aggregateDimension(dimension.campaigns, {
          ...window,
          snapshotDate,
          trend,
        }),
      })
    }
  }

  return output
}
