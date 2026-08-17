export const CORE_TABLES = [
  {
    name: 'dataset_imports',
    description: 'Tracks source snapshots and import runs for provenance.',
    ddl: `
      CREATE TABLE IF NOT EXISTS dataset_imports (
        id BIGSERIAL PRIMARY KEY,
        source_name TEXT NOT NULL,
        snapshot_version TEXT NOT NULL,
        source_file_name TEXT,
        imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
      );
    `,
  },
  {
    name: 'campaigns_raw',
    description: 'Stores canonical deduplicated Kickstarter campaign rows and raw payloads.',
    ddl: `
      CREATE TABLE IF NOT EXISTS campaigns_raw (
        id BIGSERIAL PRIMARY KEY,
        dataset_import_id BIGINT REFERENCES dataset_imports(id) ON DELETE SET NULL,
        kickstarter_project_id BIGINT NOT NULL UNIQUE,
        project_name TEXT NOT NULL,
        slug TEXT,
        creator_id BIGINT,
        creator_name TEXT,
        blurb TEXT,
        kickstarter_category_name TEXT,
        kickstarter_category_slug TEXT,
        kickstarter_parent_category_name TEXT,
        country TEXT,
        currency TEXT,
        goal NUMERIC,
        pledged NUMERIC,
        usd_pledged NUMERIC,
        converted_pledged_amount NUMERIC,
        backers_count INTEGER,
        raw_state TEXT,
        created_at_ts TIMESTAMPTZ,
        launched_at_ts TIMESTAMPTZ,
        deadline_ts TIMESTAMPTZ,
        project_url TEXT,
        source_urls_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        raw_payload_json JSONB NOT NULL
      );
    `,
  },
  {
    name: 'campaigns_normalized',
    description: 'Stores deterministic derived metrics and normalized status fields.',
    ddl: `
      CREATE TABLE IF NOT EXISTS campaigns_normalized (
        campaign_id BIGINT PRIMARY KEY REFERENCES campaigns_raw(id) ON DELETE CASCADE,
        normalized_status TEXT NOT NULL,
        funding_multiple NUMERIC,
        average_pledge NUMERIC,
        campaign_duration_days INTEGER,
        campaign_age_days INTEGER,
        has_project_url BOOLEAN NOT NULL DEFAULT false,
        is_fully_researchable BOOLEAN NOT NULL DEFAULT false,
        derived_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
  {
    name: 'subset_memberships',
    description: 'Tracks POC subset membership, confidence, and review decisions.',
    ddl: `
      CREATE TABLE IF NOT EXISTS subset_memberships (
        id BIGSERIAL PRIMARY KEY,
        campaign_id BIGINT NOT NULL REFERENCES campaigns_raw(id) ON DELETE CASCADE,
        subset_key TEXT NOT NULL,
        subset_version TEXT NOT NULL,
        membership_status TEXT NOT NULL,
        confidence_label TEXT,
        reason_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS subset_memberships_unique_campaign_version
      ON subset_memberships (campaign_id, subset_key, subset_version);
    `,
  },
  {
    name: 'taxonomy_nodes',
    description: 'Stores hierarchical taxonomy nodes for category and product classification.',
    ddl: `
      CREATE TABLE IF NOT EXISTS taxonomy_nodes (
        id BIGSERIAL PRIMARY KEY,
        domain_key TEXT NOT NULL,
        parent_id BIGINT REFERENCES taxonomy_nodes(id) ON DELETE SET NULL,
        label TEXT NOT NULL,
        slug TEXT NOT NULL,
        node_type TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS taxonomy_nodes_unique_domain_slug
      ON taxonomy_nodes (domain_key, slug);
    `,
  },
  {
    name: 'campaign_classifications',
    description: 'Stores campaign taxonomy assignments and classification provenance.',
    ddl: `
      CREATE TABLE IF NOT EXISTS campaign_classifications (
        id BIGSERIAL PRIMARY KEY,
        campaign_id BIGINT NOT NULL REFERENCES campaigns_raw(id) ON DELETE CASCADE,
        taxonomy_node_id BIGINT NOT NULL REFERENCES taxonomy_nodes(id) ON DELETE CASCADE,
        classification_method TEXT NOT NULL,
        classification_version TEXT NOT NULL,
        confidence_score NUMERIC,
        is_primary BOOLEAN NOT NULL DEFAULT false,
        notes TEXT,
        evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS campaign_classifications_unique_assignment
      ON campaign_classifications (
        campaign_id,
        taxonomy_node_id,
        classification_method,
        classification_version
      );
    `,
  },
]
