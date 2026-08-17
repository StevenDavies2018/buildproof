import postgres from 'postgres'

export function hasDatabaseConfig() {
  return Boolean(process.env.POSTGRES_URL)
}

export function getSql() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not configured')
  }

  return postgres(process.env.POSTGRES_URL, { ssl: 'require' })
}
