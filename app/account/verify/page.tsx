import Link from 'next/link'
import { verifyEmail } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function VerifyAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  let message = 'This verification link is invalid or expired.'
  let verified = false
  if (token) {
    try {
      await verifyEmail(token)
      message = 'Your email is verified. You can now sign in.'
      verified = true
    } catch (error) {
      message = error instanceof Error ? error.message : message
    }
  }

  return (
    <main className="bs-shell">
      <div className="bs-container max-w-2xl">
        <section className="bs-panel">
          <p className="bs-kicker">Account verification</p>
          <h1 className="bs-title mt-2 text-4xl font-semibold">{verified ? 'Email verified' : 'Verification unavailable'}</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">{message}</p>
          <Link href="/account" className="bs-button-primary mt-6 inline-flex">Return to account</Link>
        </section>
      </div>
    </main>
  )
}
