import assert from 'node:assert/strict'
import test from 'node:test'
import {
  evaluateResearchBenchmark,
  type ResearchBenchmarkDefinition,
} from '../lib/research-benchmarks.ts'
import type { ResearchCandidate } from '../lib/research-query.ts'

type TestCandidate = ResearchCandidate & { description: string | null }

function candidate(
  campaignId: number,
  projectName: string,
  taxonomyLabels: string[],
): TestCandidate {
  return {
    campaignId,
    projectName,
    projectUrl: `https://www.kickstarter.com/projects/test/${campaignId}`,
    blurb: projectName,
    description: projectName,
    creatorName: 'Benchmark Creator',
    categoryName: 'Tabletop Games',
    categorySlug: 'games/tabletop games',
    launchedAt: '2025-01-01T00:00:00Z',
    goalUsd: '1000',
    pledgedUsd: '2000',
    backersCount: 100,
    isFullyResearchable: true,
    primaryClassificationLabel: taxonomyLabels[0] ?? null,
    taxonomyLabels,
  }
}

const benchmark: ResearchBenchmarkDefinition = {
  key: 'dice',
  idea: 'resin dice set',
  intent: 'Find resin dice.',
  expectedTaxonomy: ['Dice'],
  trustedCampaignIds: [1],
  manualVerdict: 'approved',
  reviewNote: 'Fixture benchmark.',
}

test('passes when the top result and most top-five results match expected taxonomy', () => {
  const result = evaluateResearchBenchmark(benchmark, [
    candidate(1, 'Resin Dice Set One', ['Dice']),
    candidate(2, 'Resin Dice Set Two', ['Dice']),
    candidate(3, 'Resin Dice Set Three', ['Dice']),
    candidate(4, 'Resin Dice Accessory', ['Tabletop Accessories']),
    candidate(5, 'Resin Dice Storage', ['Storage']),
  ])

  assert.equal(result.automaticVerdict, 'pass')
  assert.equal(result.taxonomyHits, 3)
  assert.equal(result.trustedHits, 1)
})

test('warns when a trusted textual match lacks expected taxonomy precision', () => {
  const result = evaluateResearchBenchmark(benchmark, [
    candidate(1, 'Resin Dice Set One', ['TTRPG']),
    candidate(2, 'Resin Dice Set Two', ['TTRPG']),
    candidate(3, 'Resin Dice Set Three', ['TTRPG']),
    candidate(4, 'Resin Dice Set Four', ['TTRPG']),
    candidate(5, 'Resin Dice Set Five', ['TTRPG']),
  ])

  assert.equal(result.automaticVerdict, 'warning')
  assert.equal(result.taxonomyHits, 0)
  assert.equal(result.trustedHits, 1)
})
