import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { applySubscriptionState, findUserIdByStripeCustomerId } from '@/lib/billing'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

async function resolveUserId(customerId: string, metadataUserId: string | undefined) {
  const fromMetadata = metadataUserId ? Number.parseInt(metadataUserId, 10) : NaN
  if (Number.isFinite(fromMetadata)) return fromMetadata
  return findUserIdByStripeCustomerId(customerId)
}

// `current_period_end` lives on the subscription's line item, not the
// subscription itself, as of Stripe's flexible-billing API versions.
function getCurrentPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const periodEndSeconds = subscription.items.data[0]?.current_period_end
  return typeof periodEndSeconds === 'number' ? new Date(periodEndSeconds * 1000) : null
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const userId = await resolveUserId(customerId, subscription.metadata?.userId)
  if (!userId) return

  await applySubscriptionState({
    userId,
    customerId,
    subscriptionId: subscription.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: getCurrentPeriodEnd(subscription),
  })
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook is not configured' }, { status: 400 })
  }

  const rawBody = await request.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid signature' },
      { status: 400 },
    )
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription' || !session.subscription || !session.customer) break
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription.id
      const userId = await resolveUserId(
        customerId,
        session.client_reference_id ?? session.metadata?.userId,
      )
      if (!userId) break

      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      await applySubscriptionState({
        userId,
        customerId,
        subscriptionId: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: getCurrentPeriodEnd(subscription),
      })
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await handleSubscriptionEvent(event.data.object as Stripe.Subscription)
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
