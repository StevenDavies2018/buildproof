import postgres from 'postgres'

export function hasDatabaseConfig() {
  return Boolean(process.env.POSTGRES_URL)
}

// A single long-lived client, reused across requests within a warm
// serverless instance instead of opening a fresh connection (and paying a
// new TCP+TLS handshake to Neon's pooler) on every call. Never closed here —
// call sites used to call sql.end() after each use, which tore the
// connection down for anyone else still using it and defeated pooling
// entirely; that also meant every getSql() caller was responsible for
// closing it, and several call sites never did, silently leaking
// connections across invocations.
let cachedSql: ReturnType<typeof postgres> | null = null

export function getSql() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not configured')
  }

  if (!cachedSql) {
    cachedSql = postgres(process.env.POSTGRES_URL, { ssl: 'require' })
  }

  return cachedSql
}
