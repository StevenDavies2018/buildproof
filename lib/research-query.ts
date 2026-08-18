export const RESEARCH_RANKING_VERSION = 'deterministic-lexical-v1'

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'i',
  'in',
  'is',
  'it',
  'my',
  'of',
  'on',
  'or',
  'project',
  'that',
  'the',
  'this',
  'to',
  'want',
  'with',
])

export type ResearchCandidate = {
  campaignId: number
  projectName: string
  projectUrl: string | null
  blurb: string | null
  creatorName: string | null
  categoryName: string | null
  categorySlug: string | null
  launchedAt: string | null
  goalUsd: string | null
  pledgedUsd: string | null
  backersCount: number | null
  isFullyResearchable: boolean
  primaryClassificationLabel: string | null
  taxonomyLabels: string[]
  descriptionMatchedTerms?: string[]
}

export type ResearchRankingContext = {
  idea: string
  categorySlug?: string
  taxonomyLabel?: string
}

export type RankedResearchCandidate<T> = T & {
  relevanceScore: number
  matchReasons: string[]
  matchedTerms: string[]
}

export function normalizeResearchText(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .replace(/d\s*&\s*d/g, 'dnd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function tokenizeResearchIdea(idea: string) {
  const terms = normalizeResearchText(idea)
    .split(/\s+/)
    .filter((term) => term.length >= 2 && !STOP_WORDS.has(term))

  return Array.from(new Set(terms)).slice(0, 12)
}

function matchingTerms(terms: string[], value: string | null | undefined) {
  const tokens = new Set(normalizeResearchText(value).split(/\s+/).filter(Boolean))
  return terms.filter((term) => tokens.has(term))
}

function termList(terms: string[]) {
  return terms.slice(0, 4).map((term) => `"${term}"`).join(', ')
}

function completeness(candidate: ResearchCandidate) {
  return [
    Boolean(candidate.blurb),
    Boolean(candidate.projectUrl),
    Boolean(candidate.launchedAt),
    Boolean(candidate.goalUsd && candidate.pledgedUsd),
    candidate.backersCount !== null,
    candidate.taxonomyLabels.length > 0,
  ].filter(Boolean).length
}

export function rankResearchCandidates<T extends ResearchCandidate>(
  candidates: T[],
  context: ResearchRankingContext,
): Array<RankedResearchCandidate<T>> {
  const terms = tokenizeResearchIdea(context.idea)
  const normalizedIdea = normalizeResearchText(context.idea)

  return candidates
    .map((candidate) => {
      const titleMatches = matchingTerms(terms, candidate.projectName)
      const blurbMatches = matchingTerms(terms, candidate.blurb)
      const creatorMatches = matchingTerms(terms, candidate.creatorName)
      const categoryMatches = matchingTerms(
        terms,
        `${candidate.categoryName ?? ''} ${candidate.categorySlug ?? ''}`,
      )
      const taxonomyMatches = matchingTerms(
        terms,
        [candidate.primaryClassificationLabel, ...candidate.taxonomyLabels]
          .filter(Boolean)
          .join(' '),
      )
      const descriptionMatches = candidate.descriptionMatchedTerms ?? []
      const matchedTerms = Array.from(
        new Set([
          ...titleMatches,
          ...taxonomyMatches,
          ...blurbMatches,
          ...descriptionMatches,
          ...categoryMatches,
          ...creatorMatches,
        ]),
      )
      const reasons: string[] = []
      let score = 0
      const searchableText = normalizeResearchText(
        [
          candidate.projectName,
          candidate.blurb,
          candidate.creatorName,
          candidate.categoryName,
          candidate.categorySlug,
          candidate.primaryClassificationLabel,
          ...candidate.taxonomyLabels,
        ]
          .filter(Boolean)
          .join(' '),
      )
      const allTermsMatch = terms.length > 1 && terms.every((term) => searchableText.includes(term))

      if (normalizedIdea.length >= 4 && normalizeResearchText(candidate.projectName).includes(normalizedIdea)) {
        score += 45
        reasons.push('Project title contains the complete research phrase')
      }
      if (allTermsMatch) {
        score += 24
        reasons.push('All research terms appear in the campaign record')
      }
      if (titleMatches.length) {
        score += titleMatches.length * 14
        reasons.push(`Title matches ${termList(titleMatches)}`)
      }
      if (taxonomyMatches.length) {
        score += taxonomyMatches.length * 12
        reasons.push(`Taxonomy matches ${termList(taxonomyMatches)}`)
      }
      if (blurbMatches.length) {
        score += blurbMatches.length * 7
        reasons.push(`Campaign summary matches ${termList(blurbMatches)}`)
      }
      if (descriptionMatches.length) {
        score += descriptionMatches.length * 3
        reasons.push(`Full project description matches ${termList(descriptionMatches)}`)
      }
      if (categoryMatches.length) {
        score += categoryMatches.length * 8
        reasons.push(`Kickstarter category matches ${termList(categoryMatches)}`)
      }
      if (creatorMatches.length) {
        score += creatorMatches.length * 3
        reasons.push(`Creator name matches ${termList(creatorMatches)}`)
      }

      if (context.taxonomyLabel && candidate.taxonomyLabels.includes(context.taxonomyLabel)) {
        score += 12
        reasons.push(`Matches selected taxonomy: ${context.taxonomyLabel}`)
      }
      if (context.categorySlug && candidate.categorySlug === context.categorySlug) {
        score += 8
        reasons.push(`Matches selected category: ${candidate.categoryName ?? context.categorySlug}`)
      }
      if (candidate.isFullyResearchable) {
        score += 8
        reasons.push('Fully researchable source record')
      }

      const completenessCount = completeness(candidate)
      score += completenessCount
      if (completenessCount === 6) {
        reasons.push('Complete source, taxonomy, date, backer, and normalized money data')
      }

      return {
        ...candidate,
        relevanceScore: score,
        matchReasons: reasons.slice(0, 5),
        matchedTerms,
      }
    })
    .sort((left, right) => {
      if (right.relevanceScore !== left.relevanceScore) {
        return right.relevanceScore - left.relevanceScore
      }
      if (left.isFullyResearchable !== right.isFullyResearchable) {
        return left.isFullyResearchable ? -1 : 1
      }
      const backerDifference = (right.backersCount ?? -1) - (left.backersCount ?? -1)
      if (backerDifference !== 0) return backerDifference
      return left.projectName.localeCompare(right.projectName)
    })
}
