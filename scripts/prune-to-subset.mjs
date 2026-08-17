import fs from 'node:fs'
import path from 'node:path'
import postgres from 'postgres'

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
  const args = {
    subsetKey: 'ttrpg_poc',
    subsetVersion: null,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--') {
      continue
    } else if (arg === '--subset-key') {
      args.subsetKey = argv[i + 1]
      i += 1
    } else if (arg === '--subset-version') {
      args.subsetVersion = argv[i + 1]
      i += 1
    }
  }

  return args
}

async function main() {
  loadLocalEnv()
  const args = parseArgs(process.argv.slice(2))

  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not configured in the environment or .env.local')
  }

  const sql = postgres(process.env.POSTGRES_URL, { ssl: 'require' })

  try {
    const subsetVersionClause = args.subsetVersion
      ? sql`AND sm.subset_version = ${args.subsetVersion}`
      : sql``

    const [before] = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM campaigns_raw) AS campaigns_raw,
        (SELECT COUNT(*)::int FROM campaigns_normalized) AS campaigns_normalized,
        (SELECT COUNT(*)::int FROM subset_memberships) AS subset_memberships
    `

    const removed = await sql`
      DELETE FROM campaigns_raw cr
      WHERE NOT EXISTS (
        SELECT 1
        FROM subset_memberships sm
        WHERE sm.campaign_id = cr.id
          AND sm.subset_key = ${args.subsetKey}
          ${subsetVersionClause}
      )
      RETURNING cr.id
    `

    const deletedImportRows = await sql`
      DELETE FROM dataset_imports di
      WHERE NOT EXISTS (
        SELECT 1
        FROM campaigns_raw cr
        WHERE cr.dataset_import_id = di.id
      )
      RETURNING di.id
    `

    const [after] = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM campaigns_raw) AS campaigns_raw,
        (SELECT COUNT(*)::int FROM campaigns_normalized) AS campaigns_normalized,
        (SELECT COUNT(*)::int FROM subset_memberships) AS subset_memberships
    `

    console.log(
      JSON.stringify(
        {
          subsetKey: args.subsetKey,
          subsetVersion: args.subsetVersion,
          removedCampaigns: removed.length,
          removedDatasetImports: deletedImportRows.length,
          before,
          after,
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
