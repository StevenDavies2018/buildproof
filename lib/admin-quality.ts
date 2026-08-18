import { getSql, hasDatabaseConfig } from '@/lib/db'

export type AdminQualitySummary = {
  totalCampaigns: number
  fullyResearchable: number
  missingNormalizedRecord: number
  missingProjectUrl: number
  invalidProjectUrl: number
  missingDescription: number
  missingLaunchDate: number
  missingDeadline: number
  invalidDateOrder: number
  missingDuration: number
  invalidDuration: number
  missingNativeMoney: number
  missingComparableMoney: number
  unavailableCurrencyRate: number
  invalidCurrencyRate: number
  goalFormulaMismatch: number
  pledgedFormulaMismatch: number
  missingClassification: number
  missingPrimaryClassification: number
  duplicateProjectUrls: number
}

export type AdminQualityBreakdown = {
  label: string
  detail: string
  campaignCount: number
}

export type AdminQualityIssueRow = {
  campaignId: number
  projectName: string
  projectUrl: string | null
  issues: string[]
}

export type AdminQualityVersions = {
  sourceSnapshotVersion: string | null
  normalizationVersion: string | null
  classificationVersion: string | null
  analysisVersion: string | null
  analysisCalculatedAt: string | null
}

const EMPTY_SUMMARY: AdminQualitySummary = {
  totalCampaigns: 0,
  fullyResearchable: 0,
  missingNormalizedRecord: 0,
  missingProjectUrl: 0,
  invalidProjectUrl: 0,
  missingDescription: 0,
  missingLaunchDate: 0,
  missingDeadline: 0,
  invalidDateOrder: 0,
  missingDuration: 0,
  invalidDuration: 0,
  missingNativeMoney: 0,
  missingComparableMoney: 0,
  unavailableCurrencyRate: 0,
  invalidCurrencyRate: 0,
  goalFormulaMismatch: 0,
  pledgedFormulaMismatch: 0,
  missingClassification: 0,
  missingPrimaryClassification: 0,
  duplicateProjectUrls: 0,
}

export async function getAdminQualityOverview() {
  if (!hasDatabaseConfig()) {
    return {
      configured: false,
      summary: EMPTY_SUMMARY,
      normalizationBreakdown: [] as AdminQualityBreakdown[],
      statusBreakdown: [] as AdminQualityBreakdown[],
      issueRows: [] as AdminQualityIssueRow[],
      versions: {
        sourceSnapshotVersion: null,
        normalizationVersion: null,
        classificationVersion: null,
        analysisVersion: null,
        analysisCalculatedAt: null,
      } as AdminQualityVersions,
    }
  }

  const sql = getSql()

  try {
    const [summary] = await sql<AdminQualitySummary[]>`
      WITH latest_memberships AS (
        SELECT DISTINCT ON (sm.campaign_id)
          sm.campaign_id,
          sm.membership_status
        FROM subset_memberships sm
        WHERE sm.subset_key = 'ttrpg_poc'
        ORDER BY sm.campaign_id, sm.created_at DESC, sm.id DESC
      ),
      poc_campaigns AS (
        SELECT lm.campaign_id
        FROM latest_memberships lm
        WHERE lm.membership_status <> 'exclude'
      ),
      duplicate_urls AS (
        SELECT cr.project_url
        FROM campaigns_raw cr
        INNER JOIN poc_campaigns pc ON pc.campaign_id = cr.id
        WHERE cr.project_url IS NOT NULL
        GROUP BY cr.project_url
        HAVING COUNT(*) > 1
      )
      SELECT
        COUNT(*)::int AS "totalCampaigns",
        COUNT(*) FILTER (WHERE cn.is_fully_researchable)::int AS "fullyResearchable",
        COUNT(*) FILTER (WHERE cn.campaign_id IS NULL)::int AS "missingNormalizedRecord",
        COUNT(*) FILTER (WHERE cr.project_url IS NULL OR BTRIM(cr.project_url) = '')::int AS "missingProjectUrl",
        COUNT(*) FILTER (
          WHERE cr.project_url IS NOT NULL
            AND cr.project_url !~* '^https://(www\\.)?kickstarter\\.com/projects/'
        )::int AS "invalidProjectUrl",
        COUNT(*) FILTER (
          WHERE COALESCE(NULLIF(BTRIM(cr.blurb), ''), NULLIF(BTRIM(cr.raw_payload_json->'data'->>'description'), '')) IS NULL
        )::int AS "missingDescription",
        COUNT(*) FILTER (WHERE cr.launched_at_ts IS NULL)::int AS "missingLaunchDate",
        COUNT(*) FILTER (WHERE cr.deadline_ts IS NULL)::int AS "missingDeadline",
        COUNT(*) FILTER (
          WHERE cr.launched_at_ts IS NOT NULL
            AND cr.deadline_ts IS NOT NULL
            AND cr.deadline_ts <= cr.launched_at_ts
        )::int AS "invalidDateOrder",
        COUNT(*) FILTER (WHERE cn.campaign_duration_days IS NULL)::int AS "missingDuration",
        COUNT(*) FILTER (
          WHERE cn.campaign_duration_days IS NOT NULL
            AND (
              cn.campaign_duration_days <= 0
              OR cn.campaign_duration_days > 120
              OR (
                cr.launched_at_ts IS NOT NULL
                AND cr.deadline_ts IS NOT NULL
                AND ABS(cn.campaign_duration_days - EXTRACT(EPOCH FROM (cr.deadline_ts - cr.launched_at_ts)) / 86400.0) > 1
              )
            )
        )::int AS "invalidDuration",
        COUNT(*) FILTER (WHERE cr.goal IS NULL OR cr.pledged IS NULL OR cr.currency IS NULL)::int AS "missingNativeMoney",
        COUNT(*) FILTER (WHERE cmn.usd_goal IS NULL OR cmn.usd_pledged IS NULL)::int AS "missingComparableMoney",
        COUNT(*) FILTER (WHERE cmn.campaign_id IS NULL OR cmn.rate_source = 'unavailable')::int AS "unavailableCurrencyRate",
        COUNT(*) FILTER (
          WHERE cmn.usd_rate IS NOT NULL
            AND (cmn.usd_rate <= 0 OR (cmn.native_currency = 'USD' AND cmn.usd_rate <> 1))
        )::int AS "invalidCurrencyRate",
        COUNT(*) FILTER (
          WHERE cmn.usd_goal IS NOT NULL
            AND ABS(cmn.usd_goal - (cmn.native_goal * cmn.usd_rate)) > 0.01
        )::int AS "goalFormulaMismatch",
        COUNT(*) FILTER (
          WHERE cmn.usd_pledged IS NOT NULL
            AND ABS(cmn.usd_pledged - (cmn.native_pledged * cmn.usd_rate)) > 0.01
        )::int AS "pledgedFormulaMismatch",
        COUNT(*) FILTER (WHERE cls.classification_count = 0)::int AS "missingClassification",
        COUNT(*) FILTER (WHERE cls.primary_count = 0)::int AS "missingPrimaryClassification",
        COUNT(*) FILTER (WHERE du.project_url IS NOT NULL)::int AS "duplicateProjectUrls"
      FROM poc_campaigns pc
      INNER JOIN campaigns_raw cr ON cr.id = pc.campaign_id
      LEFT JOIN campaigns_normalized cn ON cn.campaign_id = cr.id
      LEFT JOIN campaign_currency_normalizations cmn ON cmn.campaign_id = cr.id
      LEFT JOIN duplicate_urls du ON du.project_url = cr.project_url
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS classification_count,
          COUNT(*) FILTER (WHERE cc.is_primary)::int AS primary_count
        FROM campaign_classifications cc
        WHERE cc.campaign_id = cr.id
      ) cls ON true
    `

    const normalizationBreakdown = await sql<AdminQualityBreakdown[]>`
      WITH poc_campaigns AS (
        SELECT DISTINCT sm.campaign_id
        FROM subset_memberships sm
        WHERE sm.subset_key = 'ttrpg_poc' AND sm.membership_status <> 'exclude'
      )
      SELECT
        COALESCE(cmn.rate_source, 'missing') AS label,
        COALESCE(cmn.rate_confidence, 'unavailable') AS detail,
        COUNT(*)::int AS "campaignCount"
      FROM poc_campaigns pc
      LEFT JOIN campaign_currency_normalizations cmn ON cmn.campaign_id = pc.campaign_id
      GROUP BY cmn.rate_source, cmn.rate_confidence
      ORDER BY COUNT(*) DESC, label ASC
    `

    const statusBreakdown = await sql<AdminQualityBreakdown[]>`
      WITH poc_campaigns AS (
        SELECT DISTINCT sm.campaign_id
        FROM subset_memberships sm
        WHERE sm.subset_key = 'ttrpg_poc' AND sm.membership_status <> 'exclude'
      )
      SELECT
        cn.normalized_status AS label,
        COALESCE(cr.raw_state, 'missing source state') AS detail,
        COUNT(*)::int AS "campaignCount"
      FROM poc_campaigns pc
      INNER JOIN campaigns_raw cr ON cr.id = pc.campaign_id
      INNER JOIN campaigns_normalized cn ON cn.campaign_id = cr.id
      GROUP BY cn.normalized_status, cr.raw_state
      ORDER BY COUNT(*) DESC, cn.normalized_status ASC, cr.raw_state ASC
    `

    const issueRows = await sql<AdminQualityIssueRow[]>`
      WITH poc_campaigns AS (
        SELECT DISTINCT sm.campaign_id
        FROM subset_memberships sm
        WHERE sm.subset_key = 'ttrpg_poc' AND sm.membership_status <> 'exclude'
      ),
      quality_rows AS (
        SELECT
          cr.id AS "campaignId",
          cr.project_name AS "projectName",
          cr.project_url AS "projectUrl",
          ARRAY_REMOVE(ARRAY[
            CASE WHEN cr.project_url IS NULL OR BTRIM(cr.project_url) = '' THEN 'Missing campaign URL' END,
            CASE WHEN cr.project_url IS NOT NULL AND cr.project_url !~* '^https://(www\\.)?kickstarter\\.com/projects/' THEN 'Invalid campaign URL' END,
            CASE WHEN COALESCE(NULLIF(BTRIM(cr.blurb), ''), NULLIF(BTRIM(cr.raw_payload_json->'data'->>'description'), '')) IS NULL THEN 'Missing description' END,
            CASE WHEN cr.launched_at_ts IS NULL THEN 'Missing launch date' END,
            CASE WHEN cr.deadline_ts IS NULL THEN 'Missing deadline' END,
            CASE WHEN cr.launched_at_ts IS NOT NULL AND cr.deadline_ts IS NOT NULL AND cr.deadline_ts <= cr.launched_at_ts THEN 'Invalid date order' END,
            CASE WHEN cn.campaign_duration_days IS NULL THEN 'Missing duration' END,
            CASE WHEN cn.campaign_id IS NULL THEN 'Missing normalized record' END,
            CASE WHEN cn.campaign_duration_days <= 0 OR cn.campaign_duration_days > 120 THEN 'Suspicious duration' END,
            CASE WHEN cr.goal IS NULL OR cr.pledged IS NULL OR cr.currency IS NULL THEN 'Missing native money' END,
            CASE WHEN cmn.usd_goal IS NULL OR cmn.usd_pledged IS NULL THEN 'Money not comparable' END,
            CASE WHEN cmn.campaign_id IS NULL OR cmn.rate_source = 'unavailable' THEN 'Currency rate unavailable' END,
            CASE WHEN cmn.usd_rate IS NOT NULL AND (cmn.usd_rate <= 0 OR (cmn.native_currency = 'USD' AND cmn.usd_rate <> 1)) THEN 'Invalid currency rate' END,
            CASE WHEN cmn.usd_goal IS NOT NULL AND ABS(cmn.usd_goal - (cmn.native_goal * cmn.usd_rate)) > 0.01 THEN 'Goal conversion mismatch' END,
            CASE WHEN cmn.usd_pledged IS NOT NULL AND ABS(cmn.usd_pledged - (cmn.native_pledged * cmn.usd_rate)) > 0.01 THEN 'Pledged conversion mismatch' END,
            CASE WHEN cls.classification_count = 0 THEN 'Missing classification' END,
            CASE WHEN cls.primary_count = 0 THEN 'Missing primary category' END
          ], NULL)::text[] AS issues
        FROM poc_campaigns pc
        INNER JOIN campaigns_raw cr ON cr.id = pc.campaign_id
        LEFT JOIN campaigns_normalized cn ON cn.campaign_id = cr.id
        LEFT JOIN campaign_currency_normalizations cmn ON cmn.campaign_id = cr.id
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::int AS classification_count,
            COUNT(*) FILTER (WHERE cc.is_primary)::int AS primary_count
          FROM campaign_classifications cc
          WHERE cc.campaign_id = cr.id
        ) cls ON true
      )
      SELECT *
      FROM quality_rows
      WHERE CARDINALITY(issues) > 0
      ORDER BY CARDINALITY(issues) DESC, "projectName" ASC
      LIMIT 25
    `

    const [versions] = await sql<AdminQualityVersions[]>`
      SELECT
        (SELECT MAX(snapshot_version) FROM dataset_imports) AS "sourceSnapshotVersion",
        (SELECT normalization_version FROM campaign_currency_normalizations ORDER BY normalized_at DESC LIMIT 1) AS "normalizationVersion",
        (SELECT classification_version FROM campaign_classifications ORDER BY created_at DESC LIMIT 1) AS "classificationVersion",
        (SELECT analysis_version FROM analysis_category_metrics ORDER BY calculated_at DESC LIMIT 1) AS "analysisVersion",
        (SELECT calculated_at::text FROM analysis_category_metrics ORDER BY calculated_at DESC LIMIT 1) AS "analysisCalculatedAt"
    `

    return {
      configured: true,
      summary: summary ?? EMPTY_SUMMARY,
      normalizationBreakdown,
      statusBreakdown,
      issueRows,
      versions,
    }
  } finally {
    await sql.end()
  }
}
