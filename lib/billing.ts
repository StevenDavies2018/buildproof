import { getSql, hasDatabaseConfig } from '@/lib/db'
import { getAppUrl, getStripe, hasStripeConfig } from '@/lib/stripe'

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

export type BillingUser = {
  id: number
  email: string
}

export async function createSubscriptionCheckoutSession(user: BillingUser) {
  if (!hasStripeConfig()) throw new Error('Billing is not configured')
  if (!hasDatabaseConfig()) throw new Error('Database is not configured')

  const stripe = getStripe()
  const appUrl = getAppUrl()
  const existingCustomerId = await getStripeCustomerId(user.id)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    // Do NOT set payment_method_types here — Stripe determines eligible
    // payment methods dynamically from the Dashboard configuration.
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    client_reference_id: String(user.id),
    customer: existingCustomerId ?? undefined,
    customer_email: existingCustomerId ? undefined : user.email,
    subscription_data: {
      metadata: { userId: String(user.id) },
    },
    metadata: { userId: String(user.id) },
    success_url: `${appUrl}/account?checkout=success`,
    cancel_url: `${appUrl}/account?checkout=cancelled`,
  })

  if (!session.url) throw new Error('Stripe did not return a checkout URL')
  return session.url
}

export async function createBillingPortalSession(user: BillingUser) {
  if (!hasStripeConfig()) throw new Error('Billing is not configured')
  const stripe = getStripe()
  const customerId = await getStripeCustomerId(user.id)
  if (!customerId) throw new Error('No billing account found for this user yet')

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getAppUrl()}/account`,
    configuration: await getOrCreatePortalConfigurationId(),
  })
  return session.url
}

let cachedPortalConfigurationId: string | null = null

// Cancellation must keep access through the paid-for period, with no refund
// or proration credit — this pins that behavior in code rather than relying
// on whatever "Cancel subscription" mode happens to be set in the Dashboard.
async function getOrCreatePortalConfigurationId(): Promise<string> {
  if (cachedPortalConfigurationId) return cachedPortalConfigurationId

  const stripe = getStripe()
  const configuration = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'Backer Sonar billing',
    },
    features: {
      customer_update: { enabled: true, allowed_updates: ['email', 'address'] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        proration_behavior: 'none',
      },
      subscription_update: { enabled: false },
    },
  })

  cachedPortalConfigurationId = configuration.id
  return configuration.id
}

async function getStripeCustomerId(userId: number): Promise<string | null> {
  const sql = getSql()
  try {
    const [row] = await sql<{ stripeCustomerId: string | null }[]>`
      SELECT stripe_customer_id AS "stripeCustomerId" FROM app_users WHERE id = ${userId} LIMIT 1
    `
    return row?.stripeCustomerId ?? null
  } finally {
    await sql.end()
  }
}

// Re-fetches the subscription directly from Stripe and re-applies it. This
// is the recovery path for webhook drift (a webhook that arrived while the
// DB schema or app was temporarily broken, or any other missed/failed
// delivery) — it doesn't depend on knowing which event was missed.
export async function syncSubscriptionFromStripe(userId: number) {
  if (!hasStripeConfig()) throw new Error('Billing is not configured')

  const sql = getSql()
  let subscriptionId: string | null
  try {
    const [row] = await sql<{ stripeSubscriptionId: string | null }[]>`
      SELECT stripe_subscription_id AS "stripeSubscriptionId" FROM app_users WHERE id = ${userId} LIMIT 1
    `
    subscriptionId = row?.stripeSubscriptionId ?? null
  } finally {
    await sql.end()
  }

  if (!subscriptionId) throw new Error('No subscription on file to sync yet')

  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const periodEndSeconds = subscription.items.data[0]?.current_period_end

  await applySubscriptionState({
    userId,
    customerId,
    subscriptionId: subscription.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: typeof periodEndSeconds === 'number' ? new Date(periodEndSeconds * 1000) : null,
  })
}

function isActiveStatus(status: string) {
  return ACTIVE_SUBSCRIPTION_STATUSES.has(status)
}

export async function applySubscriptionState(input: {
  userId: number
  customerId: string
  subscriptionId: string | null
  status: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: Date | null
}) {
  const sql = getSql()
  try {
    // A subscription set to cancel_at_period_end keeps `status: 'active'`
    // right up until the period actually ends (Stripe flips the status only
    // then), so gating on `status` alone already keeps the user's paid
    // access through what they paid for — no separate "still valid until"
    // branch is needed here, just persist the flag/date for UI messaging.
    if (isActiveStatus(input.status)) {
      await sql`
        UPDATE app_users
        SET
          account_type = 'paid',
          stripe_customer_id = ${input.customerId},
          stripe_subscription_id = ${input.subscriptionId},
          stripe_subscription_status = ${input.status},
          stripe_cancel_at_period_end = ${input.cancelAtPeriodEnd},
          stripe_current_period_end = ${input.currentPeriodEnd},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${input.userId}
      `
      return
    }

    // Subscription period actually ended, or payment failed permanently:
    // fall back to free with an already-expired trial rather than deleting
    // access history, so getUserEntitlements() treats the account as
    // read-only free. No refund or proration credit is issued.
    await sql`
      UPDATE app_users
      SET
        account_type = 'free',
        trial_ends_at = LEAST(trial_ends_at, CURRENT_TIMESTAMP),
        stripe_customer_id = ${input.customerId},
        stripe_subscription_id = ${input.subscriptionId},
        stripe_subscription_status = ${input.status},
        stripe_cancel_at_period_end = false,
        stripe_current_period_end = ${input.currentPeriodEnd},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${input.userId}
    `
  } finally {
    await sql.end()
  }
}

export async function getSubscriptionAccessInfo(userId: number): Promise<{
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
}> {
  const sql = getSql()
  try {
    const [row] = await sql<{ cancelAtPeriodEnd: boolean; currentPeriodEnd: string | null }[]>`
      SELECT
        stripe_cancel_at_period_end AS "cancelAtPeriodEnd",
        stripe_current_period_end AS "currentPeriodEnd"
      FROM app_users
      WHERE id = ${userId}
      LIMIT 1
    `
    return {
      cancelAtPeriodEnd: row?.cancelAtPeriodEnd ?? false,
      currentPeriodEnd: row?.currentPeriodEnd ?? null,
    }
  } finally {
    await sql.end()
  }
}

export async function findUserIdByStripeCustomerId(customerId: string): Promise<number | null> {
  const sql = getSql()
  try {
    const [row] = await sql<{ id: number }[]>`
      SELECT id FROM app_users WHERE stripe_customer_id = ${customerId} LIMIT 1
    `
    return row?.id ?? null
  } finally {
    await sql.end()
  }
}
