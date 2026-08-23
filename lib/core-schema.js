export const CORE_TABLES = [
  {
    name: 'app_users',
    description: 'Stores Backer Sonar account identities and password hashes.',
    ddl: `
      CREATE TABLE IF NOT EXISTS app_users (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        google_subject TEXT UNIQUE,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        account_type TEXT NOT NULL DEFAULT 'free' CHECK (account_type IN ('free', 'paid')),
        trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
        stripe_customer_id TEXT UNIQUE,
        stripe_subscription_id TEXT UNIQUE,
        stripe_subscription_status TEXT,
        stripe_cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
        stripe_current_period_end TIMESTAMPTZ,
        ai_copilot_enabled BOOLEAN NOT NULL DEFAULT false,
        ai_copilot_enabled_at TIMESTAMPTZ,
        email_verified_at TIMESTAMPTZ,
        terms_accepted_at TIMESTAMPTZ,
        privacy_accepted_at TIMESTAMPTZ,
        legal_disclaimer_acknowledged_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS google_subject TEXT UNIQUE;
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'free';
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE;
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS stripe_cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMPTZ;
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS ai_copilot_enabled BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS ai_copilot_enabled_at TIMESTAMPTZ;
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS legal_disclaimer_acknowledged_at TIMESTAMPTZ;
      UPDATE app_users
      SET account_type = COALESCE(account_type, 'free')
      WHERE account_type IS NULL;
      UPDATE app_users
      SET trial_ends_at = COALESCE(trial_ends_at, created_at + INTERVAL '7 days')
      WHERE trial_ends_at IS NULL;
      ALTER TABLE app_users ALTER COLUMN trial_ends_at SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days');
      ALTER TABLE app_users ALTER COLUMN trial_ends_at SET NOT NULL;
      ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
      ALTER TABLE app_users ADD CONSTRAINT app_users_role_check CHECK (role IN ('user', 'admin'));
      ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_account_type_check;
      ALTER TABLE app_users ADD CONSTRAINT app_users_account_type_check CHECK (account_type IN ('free', 'paid'));
    `,
  },
  {
    name: 'email_verification_tokens',
    description: 'Stores one-time expiring tokens for password-account verification.',
    ddl: `
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS email_verification_tokens_user_id ON email_verification_tokens (user_id);
    `,
  },
  {
    name: 'app_sessions',
    description: 'Stores hashed, expiring HTTP-only account sessions.',
    ddl: `
      CREATE TABLE IF NOT EXISTS app_sessions (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS app_sessions_user_id ON app_sessions (user_id);
      CREATE INDEX IF NOT EXISTS app_sessions_expires_at ON app_sessions (expires_at);
    `,
  },
  {
    name: 'auth_rate_limit_events',
    description: 'Sliding-window attempt log for rate-limiting login/registration.',
    ddl: `
      CREATE TABLE IF NOT EXISTS auth_rate_limit_events (
        id BIGSERIAL PRIMARY KEY,
        bucket TEXT NOT NULL,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS auth_rate_limit_events_bucket_time ON auth_rate_limit_events (bucket, occurred_at);
    `,
  },
  {
    name: 'saved_research_items',
    description: 'Stores user-owned research views, campaigns, and comparisons.',
    ddl: `
      CREATE TABLE IF NOT EXISTS saved_research_items (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        item_key TEXT NOT NULL,
        item_type TEXT NOT NULL CHECK (item_type IN ('research', 'campaign', 'comparison')),
        label TEXT NOT NULL,
        href TEXT NOT NULL,
        payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        snapshot_version TEXT NOT NULL,
        note TEXT,
        saved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, item_key)
      );

      CREATE INDEX IF NOT EXISTS saved_research_items_user_id_saved_at
      ON saved_research_items (user_id, saved_at DESC);
    `,
  },
  {
    name: 'user_onboarding_states',
    description: 'Stores per-user onboarding walkthrough progress and completion state.',
    ddl: `
      CREATE TABLE IF NOT EXISTS user_onboarding_states (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        walkthrough_key TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('not_started', 'skipped', 'completed')),
        last_completed_step TEXT,
        completed_at TIMESTAMPTZ,
        skipped_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, walkthrough_key)
      );

      CREATE INDEX IF NOT EXISTS user_onboarding_states_user_id_updated_at
      ON user_onboarding_states (user_id, updated_at DESC);
    `,
  },
  {
    name: 'app_analytics_events',
    description: 'Stores lightweight counts-oriented analytics events for admin reporting.',
    ddl: `
      CREATE TABLE IF NOT EXISTS app_analytics_events (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
        event_name TEXT NOT NULL,
        surface TEXT NOT NULL,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS app_analytics_events_event_name_created_at
      ON app_analytics_events (event_name, created_at DESC);

      CREATE INDEX IF NOT EXISTS app_analytics_events_surface_created_at
      ON app_analytics_events (surface, created_at DESC);

      CREATE INDEX IF NOT EXISTS app_analytics_events_user_id_created_at
      ON app_analytics_events (user_id, created_at DESC);
    `,
  },
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
    name: 'campaign_currency_normalizations',
    description: 'Stores auditable native-to-USD campaign money normalization results.',
    ddl: `
      CREATE TABLE IF NOT EXISTS campaign_currency_normalizations (
        campaign_id BIGINT PRIMARY KEY REFERENCES campaigns_raw(id) ON DELETE CASCADE,
        normalization_version TEXT NOT NULL,
        native_currency TEXT,
        native_goal NUMERIC,
        native_pledged NUMERIC,
        usd_rate NUMERIC,
        usd_goal NUMERIC,
        usd_pledged NUMERIC,
        rate_source TEXT NOT NULL,
        rate_confidence TEXT NOT NULL,
        current_currency TEXT,
        source_snapshot_version TEXT,
        source_observed_at TIMESTAMPTZ,
        normalized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS campaign_currency_normalizations_rate_source
      ON campaign_currency_normalizations (rate_source);
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
  {
    name: 'analysis_category_metrics',
    description: 'Stores versioned materialized category research metrics.',
    ddl: `
      CREATE TABLE IF NOT EXISTS analysis_category_metrics (
        id BIGSERIAL PRIMARY KEY,
        subset_key TEXT NOT NULL,
        dimension_key TEXT NOT NULL,
        taxonomy_node_id BIGINT REFERENCES taxonomy_nodes(id) ON DELETE CASCADE,
        taxonomy_label TEXT NOT NULL,
        metric_window TEXT NOT NULL,
        window_start TIMESTAMPTZ,
        window_end TIMESTAMPTZ NOT NULL,
        campaign_count INTEGER NOT NULL,
        success_count INTEGER NOT NULL,
        failure_count INTEGER NOT NULL,
        success_rate NUMERIC,
        median_goal_usd NUMERIC,
        median_pledged_usd NUMERIC,
        median_backers NUMERIC,
        median_average_pledge_usd NUMERIC,
        median_funding_multiple NUMERIC,
        recent_campaign_count INTEGER NOT NULL,
        money_comparable_count INTEGER NOT NULL,
        trend_label TEXT NOT NULL,
        trend_details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        source_snapshot_version TEXT,
        currency_normalization_version TEXT,
        classification_version TEXT,
        analysis_version TEXT NOT NULL,
        calculated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS analysis_category_metrics_unique_version
      ON analysis_category_metrics (
        subset_key,
        dimension_key,
        metric_window,
        analysis_version
      );

      CREATE INDEX IF NOT EXISTS analysis_category_metrics_latest_lookup
      ON analysis_category_metrics (subset_key, analysis_version, metric_window);
    `,
  },
]
