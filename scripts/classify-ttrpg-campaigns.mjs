import fs from 'node:fs'
import path from 'node:path'
import postgres from 'postgres'
import {
  TTRPG_CLASSIFICATION_METHOD,
  TTRPG_CLASSIFICATION_VERSION,
  TTRPG_DOMAIN_KEY,
  TTRPG_SUBSET_KEY,
  classifyTtrpgCampaign,
} from '../lib/ttrpg-taxonomy.js'

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) {
    return
  }

  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separator = trimmed.indexOf('=')
    if (separator === -1) {
      continue
    }

    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim()
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function parseArgs(argv) {
  const args = {}

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) {
      continue
    }

    const key = token.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      args[key] = 'true'
      continue
    }

    args[key] = next
    index += 1
  }

  return args
}

async function main() {
  loadLocalEnv()

  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not configured in the environment or .env.local')
  }

  const args = parseArgs(process.argv.slice(2))
  const subsetKey = args['subset-key'] || TTRPG_SUBSET_KEY
  const subsetVersion = args['subset-version'] || ''

  const sql = postgres(process.env.POSTGRES_URL, { ssl: 'require' })

  try {
    const nodeRows = await sql`
      SELECT id, slug, domain_key
      FROM taxonomy_nodes
      WHERE is_active = true
      ORDER BY sort_order ASC, slug ASC
    `

    const filteredNodeRows = nodeRows.filter(
      (row) => String(row.domain_key) === TTRPG_DOMAIN_KEY,
    )

    if (filteredNodeRows.length === 0) {
      throw new Error('No taxonomy_nodes found. Run db:seed:taxonomy first.')
    }

    const nodeIdBySlug = new Map(
      filteredNodeRows.map((row) => [String(row.slug), Number(row.id)]),
    )

    const campaigns = await sql`
      SELECT DISTINCT
        cr.id,
        cr.project_name,
        cr.blurb,
        cr.kickstarter_category_name,
        cr.kickstarter_category_slug,
        cr.kickstarter_parent_category_name,
        cr.project_url,
        sm.subset_version
      FROM subset_memberships sm
      INNER JOIN campaigns_raw cr ON cr.id = sm.campaign_id
      WHERE sm.subset_key = ${subsetKey}
        AND (${subsetVersion} = '' OR sm.subset_version = ${subsetVersion})
        AND sm.membership_status IN ('include_high', 'include_medium', 'review')
      ORDER BY cr.id ASC
    `

    let inserted = 0
    let primaryAssigned = 0

    await sql.begin(async (transaction) => {
      await transaction`
        DELETE FROM campaign_classifications
        WHERE classification_method = ${TTRPG_CLASSIFICATION_METHOD}
          AND classification_version = ${TTRPG_CLASSIFICATION_VERSION}
          AND campaign_id IN (
            SELECT sm.campaign_id
            FROM subset_memberships sm
            WHERE sm.subset_key = ${subsetKey}
              AND (${subsetVersion} = '' OR sm.subset_version = ${subsetVersion})
          )
      `

      for (const campaign of campaigns) {
        const assignments = classifyTtrpgCampaign(campaign)
        let hasPrimary = false

        for (const assignment of assignments) {
          const taxonomyNodeId = nodeIdBySlug.get(assignment.slug)
          if (!taxonomyNodeId) {
            continue
          }

          await transaction`
            INSERT INTO campaign_classifications (
              campaign_id,
              taxonomy_node_id,
              classification_method,
              classification_version,
              confidence_score,
              is_primary,
              notes,
              evidence_json
            )
            VALUES (
              ${campaign.id},
              ${taxonomyNodeId},
              ${TTRPG_CLASSIFICATION_METHOD},
              ${TTRPG_CLASSIFICATION_VERSION},
              ${assignment.confidenceScore},
              ${assignment.isPrimary},
              ${assignment.isPrimary ? 'Primary label chosen by ruleset' : 'Secondary label chosen by ruleset'},
              ${JSON.stringify({
                evidence: assignment.evidence,
                subsetKey,
                subsetVersion: subsetVersion || campaign.subset_version,
              })}::jsonb
            )
            ON CONFLICT (
              campaign_id,
              taxonomy_node_id,
              classification_method,
              classification_version
            )
            DO UPDATE SET
              confidence_score = EXCLUDED.confidence_score,
              is_primary = EXCLUDED.is_primary,
              notes = EXCLUDED.notes,
              evidence_json = EXCLUDED.evidence_json
          `

          inserted += 1
          if (assignment.isPrimary) {
            hasPrimary = true
          }
        }

        if (hasPrimary) {
          primaryAssigned += 1
        }
      }
    })

    const [summary] = await sql`
      SELECT
        COUNT(*)::int AS classification_rows,
        COUNT(DISTINCT campaign_id)::int AS classified_campaigns
      FROM campaign_classifications
      WHERE classification_method = ${TTRPG_CLASSIFICATION_METHOD}
        AND classification_version = ${TTRPG_CLASSIFICATION_VERSION}
    `

    console.log(
      JSON.stringify(
        {
          subsetKey,
          subsetVersion: subsetVersion || null,
          campaignsRead: campaigns.length,
          assignmentsWritten: inserted,
          primaryAssigned,
          classificationRows: summary.classification_rows,
          classifiedCampaigns: summary.classified_campaigns,
          classificationMethod: TTRPG_CLASSIFICATION_METHOD,
          classificationVersion: TTRPG_CLASSIFICATION_VERSION,
        },
        null,
        2,
      ),
    )
  } finally {
    await sql.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
