import Stripe from 'stripe'

let cached: Stripe | null = null

export function hasStripeConfig() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID)
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  if (!cached) {
    cached = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
    })
  }
  return cached
}

export function getAppUrl() {
  // `||`, not `??` — APP_URL can be present in the environment but set to an
  // empty string, which would otherwise silently produce relative
  // success_url/cancel_url/return_url values that Stripe's API rejects.
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')
}
