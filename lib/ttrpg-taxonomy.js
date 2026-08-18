export const TTRPG_DOMAIN_KEY = 'ttrpg'
export const TTRPG_SUBSET_KEY = 'ttrpg_poc'
export const TTRPG_TAXONOMY_VERSION = '2026-08-17-initial'
export const TTRPG_CLASSIFICATION_METHOD = 'rule_based'
export const TTRPG_CLASSIFICATION_VERSION = '2026-08-17-initial'

export const TTRPG_TAXONOMY_NODES = [
  {
    slug: 'ttrpg',
    label: 'TTRPG',
    parentSlug: null,
    nodeType: 'domain',
    sortOrder: 10,
    description: 'Root taxonomy node for tabletop role-playing campaigns.',
  },
  {
    slug: 'content',
    label: 'Content',
    parentSlug: 'ttrpg',
    nodeType: 'group',
    sortOrder: 20,
    description: 'Narrative and rules content for play.',
  },
  {
    slug: 'adventures',
    label: 'Adventures',
    parentSlug: 'content',
    nodeType: 'leaf',
    sortOrder: 21,
    description: 'Adventure modules, one-shots, or campaign books.',
  },
  {
    slug: 'campaign-settings',
    label: 'Campaign Settings',
    parentSlug: 'content',
    nodeType: 'leaf',
    sortOrder: 22,
    description: 'Settings, world books, and lore collections.',
  },
  {
    slug: 'bestiaries',
    label: 'Bestiaries',
    parentSlug: 'content',
    nodeType: 'leaf',
    sortOrder: 23,
    description: 'Monster books, creature packs, and enemy compendiums.',
  },
  {
    slug: 'rules-supplements',
    label: 'Rules/Supplements',
    parentSlug: 'content',
    nodeType: 'leaf',
    sortOrder: 24,
    description: 'Classes, spells, systems, and rules expansions.',
  },
  {
    slug: 'encounters',
    label: 'Encounters',
    parentSlug: 'content',
    nodeType: 'leaf',
    sortOrder: 25,
    description: 'Encounter packs, random tables, and encounter aids.',
  },
  {
    slug: 'npcs',
    label: 'NPCs',
    parentSlug: 'content',
    nodeType: 'leaf',
    sortOrder: 26,
    description: 'NPC generators, character decks, and roleplay support.',
  },
  {
    slug: 'dm-tools',
    label: 'DM Tools',
    parentSlug: 'ttrpg',
    nodeType: 'group',
    sortOrder: 30,
    description: 'Dungeon Master and Game Master support tools.',
  },
  {
    slug: 'preparation',
    label: 'Preparation',
    parentSlug: 'dm-tools',
    nodeType: 'leaf',
    sortOrder: 31,
    description: 'Prep tools, planners, and session setup materials.',
  },
  {
    slug: 'organization',
    label: 'Organization',
    parentSlug: 'dm-tools',
    nodeType: 'leaf',
    sortOrder: 32,
    description: 'Campaign trackers, notebooks, and organization aids.',
  },
  {
    slug: 'reference',
    label: 'Reference',
    parentSlug: 'dm-tools',
    nodeType: 'leaf',
    sortOrder: 33,
    description: 'Reference cards, cheat sheets, and quick-look tools.',
  },
  {
    slug: 'combat',
    label: 'Combat',
    parentSlug: 'dm-tools',
    nodeType: 'leaf',
    sortOrder: 34,
    description: 'Initiative trackers, combat aids, and encounter flow tools.',
  },
  {
    slug: 'generators',
    label: 'Generators',
    parentSlug: 'dm-tools',
    nodeType: 'leaf',
    sortOrder: 35,
    description: 'Generators for NPCs, locations, loot, rumors, or quests.',
  },
  {
    slug: 'tabletop-accessories',
    label: 'Tabletop Accessories',
    parentSlug: 'ttrpg',
    nodeType: 'group',
    sortOrder: 40,
    description: 'Physical accessories used at the table.',
  },
  {
    slug: 'dice',
    label: 'Dice',
    parentSlug: 'tabletop-accessories',
    nodeType: 'leaf',
    sortOrder: 41,
    description: 'Dice, dice sets, and dice-adjacent tools.',
  },
  {
    slug: 'cards',
    label: 'Cards',
    parentSlug: 'tabletop-accessories',
    nodeType: 'leaf',
    sortOrder: 42,
    description: 'Card decks, reference decks, and card-driven aids.',
  },
  {
    slug: 'dm-screens',
    label: 'DM Screens',
    parentSlug: 'tabletop-accessories',
    nodeType: 'leaf',
    sortOrder: 43,
    description: 'GM screens and screen accessories.',
  },
  {
    slug: 'tokens',
    label: 'Tokens',
    parentSlug: 'tabletop-accessories',
    nodeType: 'leaf',
    sortOrder: 44,
    description: 'Tokens, markers, and similar table aids.',
  },
  {
    slug: 'storage',
    label: 'Storage',
    parentSlug: 'tabletop-accessories',
    nodeType: 'leaf',
    sortOrder: 45,
    description: 'Boxes, trays, and storage products with clear TTRPG use.',
  },
  {
    slug: 'visual',
    label: 'Visual',
    parentSlug: 'ttrpg',
    nodeType: 'group',
    sortOrder: 50,
    description: 'Visual assets and physical scene components.',
  },
  {
    slug: 'maps',
    label: 'Maps',
    parentSlug: 'visual',
    nodeType: 'leaf',
    sortOrder: 51,
    description: 'Battle maps, dungeon maps, and map packs.',
  },
  {
    slug: 'terrain',
    label: 'Terrain',
    parentSlug: 'visual',
    nodeType: 'leaf',
    sortOrder: 52,
    description: 'Terrain, scenery, and battlefield builds for TTRPG use.',
  },
  {
    slug: 'miniatures',
    label: 'Miniatures',
    parentSlug: 'visual',
    nodeType: 'leaf',
    sortOrder: 53,
    description: 'Miniatures explicitly marketed for TTRPG play.',
  },
  {
    slug: 'vtt-assets',
    label: 'VTT Assets',
    parentSlug: 'visual',
    nodeType: 'leaf',
    sortOrder: 54,
    description: 'Digital maps, tokens, and assets for virtual tabletops.',
  },
  {
    slug: 'immersion',
    label: 'Immersion',
    parentSlug: 'ttrpg',
    nodeType: 'group',
    sortOrder: 60,
    description: 'Atmosphere and in-world presentation aids.',
  },
  {
    slug: 'audio',
    label: 'Audio',
    parentSlug: 'immersion',
    nodeType: 'leaf',
    sortOrder: 61,
    description: 'Music, ambience, and soundscapes for sessions.',
  },
  {
    slug: 'props',
    label: 'Props',
    parentSlug: 'immersion',
    nodeType: 'leaf',
    sortOrder: 62,
    description: 'Physical props and tactile immersion products.',
  },
  {
    slug: 'handouts',
    label: 'Handouts',
    parentSlug: 'immersion',
    nodeType: 'leaf',
    sortOrder: 63,
    description: 'Printable or physical handouts for players.',
  },
  {
    slug: 'technology',
    label: 'Technology',
    parentSlug: 'ttrpg',
    nodeType: 'group',
    sortOrder: 70,
    description: 'Software and digital tools for TTRPG workflows.',
  },
  {
    slug: 'software',
    label: 'Software',
    parentSlug: 'technology',
    nodeType: 'leaf',
    sortOrder: 71,
    description: 'Desktop or general software tools for TTRPG use.',
  },
  {
    slug: 'web-apps',
    label: 'Web Apps',
    parentSlug: 'technology',
    nodeType: 'leaf',
    sortOrder: 72,
    description: 'Browser-based TTRPG tools and platforms.',
  },
  {
    slug: 'mobile-apps',
    label: 'Mobile Apps',
    parentSlug: 'technology',
    nodeType: 'leaf',
    sortOrder: 73,
    description: 'Mobile-first TTRPG tools and companion apps.',
  },
  {
    slug: 'vtt',
    label: 'VTT',
    parentSlug: 'technology',
    nodeType: 'leaf',
    sortOrder: 74,
    description: 'Virtual tabletop tools, systems, and integrations.',
  },
  {
    slug: 'ai-tools',
    label: 'AI',
    parentSlug: 'technology',
    nodeType: 'leaf',
    sortOrder: 75,
    description: 'AI-assisted tools positioned for TTRPG creation or play.',
  },
]

const RULES = [
  {
    slug: 'adventures',
    confidence: 0.92,
    evidence: ['adventure', 'adventures', 'module', 'modules', 'one-shot', 'quest'],
  },
  {
    slug: 'campaign-settings',
    confidence: 0.9,
    evidence: ['campaign setting', 'setting book', 'worldbook', 'world book', 'lore book', 'sourcebook'],
  },
  {
    slug: 'bestiaries',
    confidence: 0.94,
    evidence: ['bestiary', 'monster book', 'monster manual', 'creature compendium', 'monster pack'],
  },
  {
    slug: 'rules-supplements',
    confidence: 0.88,
    evidence: ['supplement', 'rulebook', 'rules expansion', 'class option', 'spellbook', 'player options'],
  },
  {
    slug: 'encounters',
    confidence: 0.86,
    evidence: ['encounter', 'encounters', 'random table', 'encounter deck'],
  },
  {
    slug: 'npcs',
    confidence: 0.89,
    evidence: ['npc', 'non-player character', 'character deck', 'villain deck'],
  },
  {
    slug: 'preparation',
    confidence: 0.83,
    evidence: ['prep', 'planner', 'session prep', 'campaign planner'],
  },
  {
    slug: 'organization',
    confidence: 0.83,
    evidence: ['tracker', 'journal', 'organizer', 'notebook'],
  },
  {
    slug: 'reference',
    confidence: 0.87,
    evidence: ['reference card', 'reference deck', 'cheat sheet', 'quick reference'],
  },
  {
    slug: 'combat',
    confidence: 0.85,
    evidence: ['initiative', 'combat tracker', 'battle tracker', 'encounter tracker'],
  },
  {
    slug: 'generators',
    confidence: 0.88,
    evidence: ['generator', 'generate', 'randomizer', 'rumor table', 'loot table'],
  },
  {
    slug: 'dice',
    confidence: 0.94,
    evidence: ['dice', 'd20', 'polyhedral'],
  },
  {
    slug: 'cards',
    confidence: 0.9,
    evidence: ['card deck', 'cards', 'deck', 'tarot-sized'],
  },
  {
    slug: 'dm-screens',
    confidence: 0.96,
    evidence: ['dm screen', 'gm screen', 'game master screen'],
  },
  {
    slug: 'tokens',
    confidence: 0.9,
    evidence: ['token', 'tokens', 'condition marker', 'status marker'],
  },
  {
    slug: 'storage',
    confidence: 0.79,
    evidence: ['storage', 'tray', 'vault', 'case', 'organizer box'],
  },
  {
    slug: 'maps',
    confidence: 0.95,
    evidence: ['map pack', 'battle map', 'battlemaps', 'dungeon map', 'hex map'],
  },
  {
    slug: 'terrain',
    confidence: 0.91,
    evidence: ['terrain', 'scatter', 'dungeon tiles', 'scene tiles'],
  },
  {
    slug: 'miniatures',
    confidence: 0.92,
    evidence: ['miniatures', 'miniature', 'minis', 'figurine', 'figures'],
  },
  {
    slug: 'vtt-assets',
    confidence: 0.96,
    evidence: ['vtt asset', 'vtt assets', 'foundry', 'roll20', 'token pack'],
  },
  {
    slug: 'audio',
    confidence: 0.88,
    evidence: ['ambience', 'soundscape', 'soundtrack', 'audio pack', 'music for your campaign'],
  },
  {
    slug: 'props',
    confidence: 0.84,
    evidence: ['prop', 'props', 'artifact replica', 'puzzle box'],
  },
  {
    slug: 'handouts',
    confidence: 0.89,
    evidence: ['handout', 'handouts', 'printable props', 'player handout'],
  },
  {
    slug: 'software',
    confidence: 0.82,
    evidence: ['software', 'app for game masters', 'desktop app'],
  },
  {
    slug: 'web-apps',
    confidence: 0.84,
    evidence: ['web app', 'browser app', 'online tool'],
  },
  {
    slug: 'mobile-apps',
    confidence: 0.87,
    evidence: ['ios app', 'android app', 'mobile app'],
  },
  {
    slug: 'vtt',
    confidence: 0.96,
    evidence: ['virtual tabletop', 'vtt', 'foundryvtt', 'roll20'],
  },
  {
    slug: 'ai-tools',
    confidence: 0.82,
    evidence: ['ai gm', 'ai dungeon master', 'ai tool', 'llm', 'generative ai'],
  },
]

function normalizeText(value) {
  return String(value || '').toLowerCase()
}

function includesAny(text, needles) {
  return needles.some((needle) => {
    const escapedNeedle = String(needle).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(^|[^a-z0-9])${escapedNeedle}([^a-z0-9]|$)`, 'i').test(text)
  })
}

function buildNodeMaps() {
  const bySlug = new Map(TTRPG_TAXONOMY_NODES.map((node) => [node.slug, node]))
  return { bySlug }
}

function collectAncestorSlugs(slug, bySlug) {
  const slugs = []
  let current = bySlug.get(slug)

  while (current && current.parentSlug) {
    slugs.unshift(current.parentSlug)
    current = bySlug.get(current.parentSlug)
  }

  return slugs
}

export function classifyTtrpgCampaign(campaign) {
  const text = [
    campaign.project_name,
    campaign.blurb,
    campaign.kickstarter_category_name,
    campaign.kickstarter_category_slug,
    campaign.kickstarter_parent_category_name,
    campaign.project_url,
  ]
    .map(normalizeText)
    .join(' ')

  const { bySlug } = buildNodeMaps()
  const assignments = new Map()

  function addAssignment(slug, confidence, evidence) {
    const existing = assignments.get(slug)
    if (!existing || confidence > existing.confidenceScore) {
      assignments.set(slug, {
        slug,
        confidenceScore: confidence,
        evidence,
      })
    }
  }

  addAssignment('ttrpg', 1, ['subset_membership'])

  if (includesAny(text, ['dungeon master', 'game master', 'gm tool', 'dm tool'])) {
    addAssignment('dm-tools', 0.88, ['dm_or_gm_language'])
  }

  if (includesAny(text, ['digital', 'pdf', 'download', 'virtual tabletop', 'vtt'])) {
    addAssignment('technology', 0.72, ['digital_delivery_language'])
  }

  if (includesAny(text, ['physical', 'printed', 'hardcover', 'box set'])) {
    addAssignment('tabletop-accessories', 0.65, ['physical_product_language'])
  }

  for (const rule of RULES) {
    if (includesAny(text, rule.evidence)) {
      addAssignment(rule.slug, rule.confidence, rule.evidence)

      for (const ancestorSlug of collectAncestorSlugs(rule.slug, bySlug)) {
        if (ancestorSlug !== 'ttrpg') {
          addAssignment(ancestorSlug, Math.max(rule.confidence - 0.08, 0.55), [
            `ancestor_of:${rule.slug}`,
          ])
        }
      }
    }
  }

  const result = Array.from(assignments.values()).sort((a, b) => {
    if (b.confidenceScore !== a.confidenceScore) {
      return b.confidenceScore - a.confidenceScore
    }

    return a.slug.localeCompare(b.slug)
  })

  let primarySlug = 'ttrpg'
  const bestLeaf = result.find((item) => bySlug.get(item.slug)?.nodeType === 'leaf')
  if (bestLeaf) {
    primarySlug = bestLeaf.slug
  } else {
    const bestGroup = result.find((item) => bySlug.get(item.slug)?.nodeType === 'group')
    if (bestGroup) {
      primarySlug = bestGroup.slug
    }
  }

  return result.map((item) => ({
    slug: item.slug,
    confidenceScore: item.confidenceScore,
    evidence: item.evidence,
    isPrimary: item.slug === primarySlug,
  }))
}
