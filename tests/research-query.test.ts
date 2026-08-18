import assert from 'node:assert/strict'
import test from 'node:test'
import {
  rankResearchCandidates,
  tokenizeResearchIdea,
  type ResearchCandidate,
} from '../lib/research-query.ts'

function candidate(overrides: Partial<ResearchCandidate>): ResearchCandidate {
  return {
    campaignId: 1,
    projectName: 'Campaign',
    projectUrl: 'https://example.com',
    blurb: 'A tabletop campaign',
    creatorName: 'Creator',
    categoryName: 'Tabletop Games',
    categorySlug: 'games/tabletop games',
    launchedAt: '2025-01-01',
    goalUsd: '1000',
    pledgedUsd: '5000',
    backersCount: 100,
    isFullyResearchable: true,
    primaryClassificationLabel: 'TTRPG',
    taxonomyLabels: ['TTRPG'],
    ...overrides,
  }
}

test('tokenizes research ideas consistently and normalizes D&D', () => {
  assert.deepEqual(tokenizeResearchIdea('A 5E D&D monster book'), ['5e', 'dnd', 'monster', 'book'])
})

test('ranks stronger title and summary matches first with explanations', () => {
  const rows = [
    candidate({
      campaignId: 1,
      projectName: 'Solo Journal',
      blurb: 'A journaling roleplaying adventure',
    }),
    candidate({ campaignId: 2, projectName: 'Generic Dice', blurb: 'A set of dice' }),
  ]
  const ranked = rankResearchCandidates(rows, { idea: 'solo journaling RPG' })

  assert.equal(ranked[0].campaignId, 1)
  assert.ok(ranked[0].relevanceScore > ranked[1].relevanceScore)
  assert.ok(ranked[0].matchReasons.some((reason) => reason.startsWith('Title matches')))
  assert.deepEqual(ranked[0].matchedTerms, ['solo', 'journaling'])
})

test('treats short search terms as whole words', () => {
  const ranked = rankResearchCandidates(
    [
      candidate({ projectName: 'The Iron Frontier: Modular Terrain' }),
      candidate({ projectName: 'AI Dungeon Master Toolkit', taxonomyLabels: ['AI'] }),
    ],
    { idea: 'AI' },
  )

  assert.equal(ranked[0].projectName, 'AI Dungeon Master Toolkit')
  assert.deepEqual(ranked[0].matchedTerms, ['ai'])
})

test('explains matches found only in the full project description', () => {
  const [ranked] = rankResearchCandidates(
    [candidate({ descriptionMatchedTerms: ['hexcrawl'] })],
    { idea: 'hexcrawl' },
  )

  assert.ok(ranked.matchReasons.includes('Full project description matches "hexcrawl"'))
  assert.deepEqual(ranked.matchedTerms, ['hexcrawl'])
})
