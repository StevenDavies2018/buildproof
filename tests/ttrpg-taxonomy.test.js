import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyTtrpgCampaign } from '../lib/ttrpg-taxonomy.js'

test('does not classify a D&D supplement as AI from substring matches', () => {
  const assignments = classifyTtrpgCampaign({
    project_name: '100 Unique Puzzles for D&D 5e Volume 2!',
    blurb: 'The 2nd installment of this DnD Supplement, containing 100+ Brain-Bending Challenges for your TTRPG needs!',
    creator_name: 'Paws for Effect',
    kickstarter_category_name: 'Tabletop Games',
    kickstarter_category_slug: 'games/tabletop games',
    kickstarter_parent_category_name: 'Games',
    project_url: 'https://www.kickstarter.com/projects/example',
  })

  assert.equal(assignments.some((assignment) => assignment.slug === 'ai-tools'), false)
  assert.equal(assignments.find((assignment) => assignment.isPrimary)?.slug, 'rules-supplements')
})
