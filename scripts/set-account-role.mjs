import fs from 'node:fs'
import path from 'node:path'
import postgres from 'postgres'

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const value = line.trim()
    const separator = value.indexOf('=')
    if (!value || value.startsWith('#') || separator === -1) continue
    const key = value.slice(0, separator).trim()
    if (!process.env[key]) process.env[key] = value.slice(separator + 1).trim()
  }
}

loadLocalEnv()
const email = process.argv[2]?.trim().toLowerCase()
const role = process.argv[3] === 'admin' ? 'admin' : 'user'
if (!email) throw new Error('Usage: node ./scripts/set-account-role.mjs email@example.com admin|user')
if (!process.env.POSTGRES_URL) throw new Error('POSTGRES_URL is not configured')

const sql = postgres(process.env.POSTGRES_URL, { ssl: 'require' })
try {
  const rows = await sql`
    UPDATE app_users SET role = ${role}, updated_at = CURRENT_TIMESTAMP
    WHERE email = ${email}
    RETURNING email, role
  `
  if (!rows.length) throw new Error(`No account found for ${email}`)
  console.log(JSON.stringify(rows[0], null, 2))
} finally {
  await sql.end()
}
