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

async function main() {
  loadLocalEnv()

  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not configured in the environment or .env.local')
  }

  const sql = postgres(process.env.POSTGRES_URL, { ssl: 'require' })

  try {
    const [summary] = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM dataset_imports) AS dataset_imports,
        (SELECT COUNT(*)::int FROM campaigns_raw) AS campaigns_raw,
        (SELECT COUNT(*)::int FROM campaigns_normalized) AS campaigns_normalized,
        (SELECT COUNT(*)::int FROM subset_memberships) AS subset_memberships,
        (SELECT COUNT(*)::int FROM taxonomy_nodes) AS taxonomy_nodes,
        (SELECT COUNT(*)::int FROM campaign_classifications) AS campaign_classifications
    `

    const recentImports = await sql`
      SELECT id, source_name, snapshot_version, source_file_name, imported_at
      FROM dataset_imports
      ORDER BY imported_at DESC
      LIMIT 5
    `

    console.log(JSON.stringify({ summary, recentImports }, null, 2))
  } finally {
    await sql.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
