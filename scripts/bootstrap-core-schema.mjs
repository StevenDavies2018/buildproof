import fs from 'node:fs'
import path from 'node:path'
import postgres from 'postgres'
import { CORE_TABLES } from '../lib/core-schema.js'

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
    for (const table of CORE_TABLES) {
      await sql.unsafe(table.ddl)
      console.log(`Ensured ${table.name}`)
    }
  } finally {
    await sql.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
