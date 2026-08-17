import { getSql, hasDatabaseConfig } from '@/lib/db'
import { CORE_TABLES } from '@/lib/core-schema'

export type SchemaTableStatus = {
  name: string
  exists: boolean
  description: string
  rowCount: number | null
}

export type SchemaSummary = {
  datasetImports: number
  campaignsRaw: number
  campaignsNormalized: number
  subsetMemberships: number
  taxonomyNodes: number
  campaignClassifications: number
}

export async function getSchemaStatus(): Promise<{
  ready: boolean
  configured: boolean
  summary: SchemaSummary | null
  tables: SchemaTableStatus[]
}> {
  if (!hasDatabaseConfig()) {
    return {
      ready: false,
      configured: false,
      summary: null,
      tables: CORE_TABLES.map((table) => ({
        name: table.name,
        exists: false,
        description: table.description,
        rowCount: null,
      })),
    }
  }

  const sql = getSql()

  try {
    const rows = await sql<{
      table_name: string
    }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `

    const existing = new Set(rows.map((row) => row.table_name))
    const tables: SchemaTableStatus[] = CORE_TABLES.map((table) => ({
      name: table.name,
      exists: existing.has(table.name),
      description: table.description,
      rowCount: null,
    }))

    let summary: SchemaSummary | null = null

    if (tables.every((table) => table.exists)) {
      const [counts] = await sql<{
        dataset_imports: number
        campaigns_raw: number
        campaigns_normalized: number
        subset_memberships: number
        taxonomy_nodes: number
        campaign_classifications: number
      }[]>`
        SELECT
          (SELECT COUNT(*)::int FROM dataset_imports) AS dataset_imports,
          (SELECT COUNT(*)::int FROM campaigns_raw) AS campaigns_raw,
          (SELECT COUNT(*)::int FROM campaigns_normalized) AS campaigns_normalized,
          (SELECT COUNT(*)::int FROM subset_memberships) AS subset_memberships,
          (SELECT COUNT(*)::int FROM taxonomy_nodes) AS taxonomy_nodes,
          (SELECT COUNT(*)::int FROM campaign_classifications) AS campaign_classifications
      `

      summary = {
        datasetImports: counts.dataset_imports,
        campaignsRaw: counts.campaigns_raw,
        campaignsNormalized: counts.campaigns_normalized,
        subsetMemberships: counts.subset_memberships,
        taxonomyNodes: counts.taxonomy_nodes,
        campaignClassifications: counts.campaign_classifications,
      }

      const countsByTable = {
        dataset_imports: counts.dataset_imports,
        campaigns_raw: counts.campaigns_raw,
        campaigns_normalized: counts.campaigns_normalized,
        subset_memberships: counts.subset_memberships,
        taxonomy_nodes: counts.taxonomy_nodes,
        campaign_classifications: counts.campaign_classifications,
      }

      for (const table of tables) {
        table.rowCount =
          countsByTable[table.name as keyof typeof countsByTable] ?? null
      }
    }

    return {
      ready: tables.every((table) => table.exists),
      configured: true,
      summary,
      tables,
    }
  } finally {
    await sql.end()
  }
}

export async function bootstrapCoreSchema() {
  if (!hasDatabaseConfig()) {
    throw new Error('POSTGRES_URL is not configured')
  }

  const sql = getSql()

  try {
    for (const table of CORE_TABLES) {
      await sql.unsafe(table.ddl)
    }
  } finally {
    await sql.end()
  }
}
