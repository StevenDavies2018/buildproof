import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
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
    file: path.resolve(
      process.cwd(),
      '..',
      'DataSet',
      'Kickstarter_2026-08-12T08_12_02_805Z_deduped.json',
    ),
    sourceName: 'Web Robots Kickstarter Dataset',
    snapshotVersion: '2026-08-12',
    notes: 'Deduplicated Kickstarter snapshot imported into Backer Sonar core schema.',
    limit: null,
    dryRun: false,
    subsetKey: null,
    subsetVersion: null,
    subsetStatus: 'include_high',
    subsetConfidence: 'include_medium',
    subsetReason: null,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--') {
      continue
    } else if (arg === '--file') {
      args.file = path.resolve(process.cwd(), argv[i + 1])
      i += 1
    } else if (arg === '--source-name') {
      args.sourceName = argv[i + 1]
      i += 1
    } else if (arg === '--snapshot-version') {
      args.snapshotVersion = argv[i + 1]
      i += 1
    } else if (arg === '--notes') {
      args.notes = argv[i + 1]
      i += 1
    } else if (arg === '--limit') {
      args.limit = Number.parseInt(argv[i + 1], 10)
      i += 1
    } else if (arg === '--dry-run') {
      args.dryRun = true
    } else if (arg === '--subset-key') {
      args.subsetKey = argv[i + 1]
      i += 1
    } else if (arg === '--subset-version') {
      args.subsetVersion = argv[i + 1]
      i += 1
    } else if (arg === '--subset-status') {
      args.subsetStatus = argv[i + 1]
      i += 1
    } else if (arg === '--subset-confidence') {
      args.subsetConfidence = argv[i + 1]
      i += 1
    } else if (arg === '--subset-reason') {
      args.subsetReason = argv[i + 1]
      i += 1
    } else if (arg === '--help') {
      console.log(`
Usage:
  pnpm db:import -- --file ../DataSet/<snapshot>.json [--limit 100]

Options:
  --file              Path to the deduplicated NDJSON snapshot
  --source-name       Dataset provider name
  --snapshot-version  Snapshot version label
  --notes             Notes stored on the import record
  --limit             Limit processed rows for testing
  --dry-run           Validate and transform rows without writing to Neon
  --subset-key        Optional subset key, e.g. ttrpg_poc
  --subset-version    Optional subset version label
  --subset-status     Membership status, default include_high
  --subset-confidence Confidence label, default include_medium
  --subset-reason     Free-form subset reason note
      `)
      process.exit(0)
    }
  }

  return args
}

function toDate(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null
  }

  return new Date(value * 1000)
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function daysBetween(start, end) {
  if (!(start instanceof Date) || Number.isNaN(start.valueOf())) {
    return null
  }
  if (!(end instanceof Date) || Number.isNaN(end.valueOf())) {
    return null
  }

  const ms = end.getTime() - start.getTime()
  return ms >= 0 ? Math.floor(ms / 86_400_000) : null
}

function normalizeStatus(rawState) {
  switch (rawState) {
    case 'successful':
      return 'successful'
    case 'failed':
    case 'canceled':
    case 'suspended':
      return 'unsuccessful'
    case 'live':
      return 'live'
    case 'submitted':
    case 'started':
      return 'prelaunch'
    default:
      return 'unknown'
  }
}

function buildTransformedRecord(record) {
  const data = record.data ?? {}
  const dedupe = record.dedupe ?? {}

  const goal = toNumber(data.goal)
  const pledged = toNumber(data.pledged)
  const usdPledged = toNumber(data.usd_pledged)
  const convertedPledgedAmount = toNumber(data.converted_pledged_amount)
  const backersCount = Number.isFinite(data.backers_count)
    ? data.backers_count
    : null

  const createdAt = toDate(data.created_at)
  const launchedAt = toDate(data.launched_at)
  const deadlineAt = toDate(data.deadline)
  const normalizedStatus = normalizeStatus(data.state)

  const fundingMultiple =
    goal && goal > 0 && pledged !== null ? pledged / goal : null
  const averagePledge =
    backersCount && backersCount > 0 && pledged !== null
      ? pledged / backersCount
      : null
  const campaignDurationDays = daysBetween(launchedAt, deadlineAt)
  const campaignAgeDays = createdAt
    ? daysBetween(createdAt, new Date())
    : null
  const projectUrl = data.urls?.web?.project ?? null
  const sourceUrls = Array.isArray(dedupe.source_urls)
    ? dedupe.source_urls.filter(Boolean)
    : data.source_url
      ? [data.source_url]
      : []

  const hasQuantitativeCore =
    goal !== null && pledged !== null && backersCount !== null
  const hasDescriptiveCore = Boolean(data.project_name ?? data.name ?? data.blurb)

  return {
    raw: {
      kickstarter_project_id: data.id,
      project_name: data.name ?? 'Untitled campaign',
      slug: data.slug ?? null,
      creator_id: data.creator?.id ?? null,
      creator_name: data.creator?.name ?? null,
      blurb: data.blurb ?? null,
      kickstarter_category_name: data.category?.name ?? null,
      kickstarter_category_slug: data.category?.slug ?? null,
      kickstarter_parent_category_name: data.category?.parent_name ?? null,
      country: data.country ?? null,
      currency: data.currency ?? null,
      goal,
      pledged,
      usd_pledged: usdPledged,
      converted_pledged_amount: convertedPledgedAmount,
      backers_count: backersCount,
      raw_state: data.state ?? null,
      created_at_ts: createdAt,
      launched_at_ts: launchedAt,
      deadline_ts: deadlineAt,
      project_url: projectUrl,
      source_urls_json: sourceUrls,
      raw_payload_json: record,
    },
    normalized: {
      normalized_status: normalizedStatus,
      funding_multiple: fundingMultiple,
      average_pledge: averagePledge,
      campaign_duration_days: campaignDurationDays,
      campaign_age_days: campaignAgeDays,
      has_project_url: Boolean(projectUrl),
      is_fully_researchable:
        Boolean(data.id) &&
        Boolean(projectUrl) &&
        hasQuantitativeCore &&
        hasDescriptiveCore,
    },
  }
}

function takeJsonObject(buffer) {
  const start = buffer.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < buffer.length; index += 1) {
    const character = buffer[index]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === '"') {
        inString = false
      }
      continue
    }

    if (character === '"') {
      inString = true
    } else if (character === '{') {
      depth += 1
    } else if (character === '}') {
      depth -= 1
      if (depth === 0) {
        return {
          json: buffer.slice(start, index + 1),
          remainder: buffer.slice(index + 1),
        }
      }
    }
  }

  return null
}

function escapeRawJsonControls(value) {
  let output = ''
  let inString = false
  let escaped = false

  for (const character of value) {
    if (inString) {
      if (escaped) {
        escaped = false
        output += character
      } else if (character === '\\') {
        escaped = true
        output += character
      } else if (character === '"') {
        inString = false
        output += character
      } else if (character === '\n') {
        output += '\\n'
      } else if (character === '\r') {
        output += '\\r'
      } else if (character === '\t') {
        output += '\\t'
      } else {
        output += character
      }
    } else {
      output += character
      if (character === '"') inString = true
    }
  }

  return output
}

async function upsertCampaign(sql, datasetImportId, transformed) {
  const raw = transformed.raw
  const normalized = transformed.normalized

  const [campaign] = await sql`
    INSERT INTO campaigns_raw (
      dataset_import_id,
      kickstarter_project_id,
      project_name,
      slug,
      creator_id,
      creator_name,
      blurb,
      kickstarter_category_name,
      kickstarter_category_slug,
      kickstarter_parent_category_name,
      country,
      currency,
      goal,
      pledged,
      usd_pledged,
      converted_pledged_amount,
      backers_count,
      raw_state,
      created_at_ts,
      launched_at_ts,
      deadline_ts,
      project_url,
      source_urls_json,
      raw_payload_json
    )
    VALUES (
      ${datasetImportId},
      ${raw.kickstarter_project_id},
      ${raw.project_name},
      ${raw.slug},
      ${raw.creator_id},
      ${raw.creator_name},
      ${raw.blurb},
      ${raw.kickstarter_category_name},
      ${raw.kickstarter_category_slug},
      ${raw.kickstarter_parent_category_name},
      ${raw.country},
      ${raw.currency},
      ${raw.goal},
      ${raw.pledged},
      ${raw.usd_pledged},
      ${raw.converted_pledged_amount},
      ${raw.backers_count},
      ${raw.raw_state},
      ${raw.created_at_ts},
      ${raw.launched_at_ts},
      ${raw.deadline_ts},
      ${raw.project_url},
      ${sql.json(raw.source_urls_json)},
      ${sql.json(raw.raw_payload_json)}
    )
    ON CONFLICT (kickstarter_project_id) DO UPDATE SET
      dataset_import_id = EXCLUDED.dataset_import_id,
      project_name = EXCLUDED.project_name,
      slug = EXCLUDED.slug,
      creator_id = EXCLUDED.creator_id,
      creator_name = EXCLUDED.creator_name,
      blurb = EXCLUDED.blurb,
      kickstarter_category_name = EXCLUDED.kickstarter_category_name,
      kickstarter_category_slug = EXCLUDED.kickstarter_category_slug,
      kickstarter_parent_category_name = EXCLUDED.kickstarter_parent_category_name,
      country = EXCLUDED.country,
      currency = EXCLUDED.currency,
      goal = EXCLUDED.goal,
      pledged = EXCLUDED.pledged,
      usd_pledged = EXCLUDED.usd_pledged,
      converted_pledged_amount = EXCLUDED.converted_pledged_amount,
      backers_count = EXCLUDED.backers_count,
      raw_state = EXCLUDED.raw_state,
      created_at_ts = EXCLUDED.created_at_ts,
      launched_at_ts = EXCLUDED.launched_at_ts,
      deadline_ts = EXCLUDED.deadline_ts,
      project_url = EXCLUDED.project_url,
      source_urls_json = EXCLUDED.source_urls_json,
      raw_payload_json = EXCLUDED.raw_payload_json
    RETURNING id
  `

  const [normalizedRow] = await sql`
    INSERT INTO campaigns_normalized (
      campaign_id,
      normalized_status,
      funding_multiple,
      average_pledge,
      campaign_duration_days,
      campaign_age_days,
      has_project_url,
      is_fully_researchable
    )
    VALUES (
      ${campaign.id},
      ${normalized.normalized_status},
      ${normalized.funding_multiple},
      ${normalized.average_pledge},
      ${normalized.campaign_duration_days},
      ${normalized.campaign_age_days},
      ${normalized.has_project_url},
      ${normalized.is_fully_researchable}
    )
    ON CONFLICT (campaign_id) DO UPDATE SET
      normalized_status = EXCLUDED.normalized_status,
      funding_multiple = EXCLUDED.funding_multiple,
      average_pledge = EXCLUDED.average_pledge,
      campaign_duration_days = EXCLUDED.campaign_duration_days,
      campaign_age_days = EXCLUDED.campaign_age_days,
      has_project_url = EXCLUDED.has_project_url,
      is_fully_researchable = EXCLUDED.is_fully_researchable,
      derived_at = CURRENT_TIMESTAMP
    RETURNING campaign_id
  `

  return normalizedRow.campaign_id
}

async function upsertSubsetMembership(sql, campaignId, args, transformed) {
  if (!args.subsetKey || !args.subsetVersion) {
    return
  }

  const reason = {
    source: 'import',
    note:
      args.subsetReason ??
      `Imported from subset file ${path.basename(args.file)} for POC curation`,
    categorySlug: transformed.raw.kickstarter_category_slug,
    projectUrl: transformed.raw.project_url,
  }

  await sql`
    INSERT INTO subset_memberships (
      campaign_id,
      subset_key,
      subset_version,
      membership_status,
      confidence_label,
      reason_json
    )
    VALUES (
      ${campaignId},
      ${args.subsetKey},
      ${args.subsetVersion},
      ${args.subsetStatus},
      ${args.subsetConfidence},
      ${sql.json(reason)}
    )
    ON CONFLICT (campaign_id, subset_key, subset_version) DO UPDATE SET
      membership_status = EXCLUDED.membership_status,
      confidence_label = EXCLUDED.confidence_label,
      reason_json = EXCLUDED.reason_json
  `
}

async function main() {
  loadLocalEnv()

  const args = parseArgs(process.argv.slice(2))
  const concurrency = Math.max(
    1,
    Number.parseInt(process.env.IMPORT_CONCURRENCY ?? '4', 10) || 4,
  )

  if (!fs.existsSync(args.file)) {
    throw new Error(`Snapshot file not found: ${args.file}`)
  }

  if (!process.env.POSTGRES_URL && !args.dryRun) {
    throw new Error('POSTGRES_URL is not configured in the environment or .env.local')
  }

  const stats = {
    read: 0,
    written: 0,
    skipped: 0,
    errors: 0,
  }

  let sql = null
  let datasetImportId = null

  if (!args.dryRun) {
    sql = postgres(process.env.POSTGRES_URL, { ssl: 'require' })
    const [importRow] = await sql`
      INSERT INTO dataset_imports (
        source_name,
        snapshot_version,
        source_file_name,
        notes
      )
      VALUES (
        ${args.sourceName},
        ${args.snapshotVersion},
        ${path.basename(args.file)},
        ${args.notes}
      )
      RETURNING id
    `
    datasetImportId = importRow.id
    console.log(`Created dataset_imports row ${datasetImportId}`)
  }

  const input = fs.createReadStream(args.file, { encoding: 'utf8' })
  const rl = readline.createInterface({
    input,
    crlfDelay: Infinity,
  })
  let recordBuffer = ''
  const pendingWrites = new Set()

  const processRecord = async (record) => {
    const transformed = buildTransformedRecord(record)

    if (!transformed.raw.kickstarter_project_id) {
      stats.skipped += 1
      return
    }

    if (!args.dryRun) {
      const campaignId = await upsertCampaign(sql, datasetImportId, transformed)
      await upsertSubsetMembership(sql, campaignId, args, transformed)
    }

    stats.written += 1
    if (stats.written % 250 === 0) {
      console.log(`Processed ${stats.written} campaigns...`)
    }
  }

  try {
    for await (const line of rl) {
      if (!line.trim()) {
        continue
      }

      if (args.limit !== null && stats.read + pendingWrites.size >= args.limit) {
        break
      }

      recordBuffer += `${line}\n`

      let extracted
      while ((extracted = takeJsonObject(recordBuffer))) {
        recordBuffer = extracted.remainder
        try {
          const record = JSON.parse(escapeRawJsonControls(extracted.json))
          stats.read += 1
          const write = processRecord(record)
          pendingWrites.add(write)
          write.finally(() => pendingWrites.delete(write))

          // Keep a bounded number of database operations in flight. This is
          // faster than serial writes without overwhelming the Neon pool.
          if (pendingWrites.size >= concurrency) {
            await Promise.race(pendingWrites)
          }
        } catch (error) {
          stats.errors += 1
          console.error(`Failed while reading record ${stats.read}:`, error)
        }
      }
    }
    if (recordBuffer.trim()) {
      stats.errors += 1
      console.error('Failed to parse trailing JSON record')
    }
    await Promise.all(pendingWrites)
  } finally {
    rl.close()
    input.close()
    if (sql) {
      await sql.end()
    }
  }

  console.log('Import complete')
  console.log(JSON.stringify(stats, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
