import fs from 'node:fs'
import path from 'node:path'
import postgres from 'postgres'
import {
  TTRPG_DOMAIN_KEY,
  TTRPG_TAXONOMY_NODES,
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

async function main() {
  loadLocalEnv()

  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not configured in the environment or .env.local')
  }

  const sql = postgres(process.env.POSTGRES_URL, { ssl: 'require' })

  try {
    const slugToId = new Map()

    for (const node of TTRPG_TAXONOMY_NODES) {
      const parentId = node.parentSlug ? slugToId.get(node.parentSlug) ?? null : null

      const [row] = await sql`
        INSERT INTO taxonomy_nodes (
          domain_key,
          parent_id,
          label,
          slug,
          node_type,
          description,
          sort_order,
          is_active,
          updated_at
        )
        VALUES (
          ${TTRPG_DOMAIN_KEY},
          ${parentId},
          ${node.label},
          ${node.slug},
          ${node.nodeType},
          ${node.description ?? null},
          ${node.sortOrder ?? 0},
          true,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (domain_key, slug)
        DO UPDATE SET
          parent_id = EXCLUDED.parent_id,
          label = EXCLUDED.label,
          node_type = EXCLUDED.node_type,
          description = EXCLUDED.description,
          sort_order = EXCLUDED.sort_order,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, slug
      `

      slugToId.set(row.slug, Number(row.id))
    }

    const [summary] = await sql`
      SELECT COUNT(*)::int AS taxonomy_nodes
      FROM taxonomy_nodes
      WHERE domain_key = ${TTRPG_DOMAIN_KEY}
    `

    console.log(
      JSON.stringify(
        {
          domainKey: TTRPG_DOMAIN_KEY,
          taxonomyNodes: summary.taxonomy_nodes,
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
