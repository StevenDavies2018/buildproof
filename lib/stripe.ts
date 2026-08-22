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
  return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}
