import type { Metadata } from 'next'
import Link from 'next/link'
import { pageMetadata } from '@/lib/seo'
import { requestPasswordResetAction, resetPasswordAction } from '../actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Reset your Backer Sonar account password.',
  ...pageMetadata('/account/reset-password'),
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; pending?: string }>
}) {
  const { token, error, pending } = await searchParams

  return (
    <main className="bs-shell">
      <div className="bs-container max-w-2xl">
        <section className="bs-panel">
          <p className="bs-kicker">Backer Sonar account</p>
          <h1 className="bs-title mt-2 text-4xl font-semibold">{token ? 'Choose a new password' : 'Reset your password'}</h1>

          {error ? (
            <p className="mt-5 min-w-0 break-words rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {decodeURIComponent(error)}
            </p>
          ) : null}
          {pending === 'reset-email-sent' ? (
            <p className="mt-5 min-w-0 break-words rounded-xl border border-sky-300 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
              If that email has a password-based account, a reset link is on its way. It expires in 24 hours.
            </p>
          ) : null}

          {token ? (
            <form action={resetPasswordAction} className="mt-6 grid gap-4 rounded-2xl border border-bs-border bg-[color:var(--bs-field-bg)] p-5">
              <input type="hidden" name="token" value={token} />
              <label className="block text-sm font-medium text-slate-700">
                New password
                <input name="password" type="password" required minLength={8} className="bs-field mt-2 w-full" />
              </label>
              <button type="submit" className="bs-button-primary justify-self-start">Reset password</button>
            </form>
          ) : (
            <form action={requestPasswordResetAction} className="mt-6 grid gap-4 rounded-2xl border border-bs-border bg-[color:var(--bs-field-bg)] p-5">
              <p className="text-sm leading-6 text-slate-600">
                Enter the email on your account and we&rsquo;ll send a link to reset your password.
              </p>
              <label className="block text-sm font-medium text-slate-700">
                Email
                <input name="email" type="email" required className="bs-field mt-2 w-full" />
              </label>
              <button type="submit" className="bs-button-primary justify-self-start">Send reset link</button>
            </form>
          )}

          <Link href="/account" className="mt-6 inline-block text-sm text-slate-500 underline underline-offset-4 hover:text-slate-700">
            Back to sign in
          </Link>
        </section>
      </div>
    </main>
  )
}
