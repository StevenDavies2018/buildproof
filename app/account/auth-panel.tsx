'use client'

import Link from 'next/link'
import { useState } from 'react'
import { loginAccount, registerAccount } from './actions'

export function AuthPanel() {
  const [mode, setMode] = useState<'signin' | 'create'>('signin')

  return (
    <div className="mt-8 mx-auto max-w-md rounded-2xl border border-bs-border bg-[color:var(--bs-field-bg)] p-5">
      <div className="flex gap-1 rounded-full border border-bs-border p-1">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${mode === 'signin' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${mode === 'create' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
        >
          Create account
        </button>
      </div>

      {mode === 'signin' ? (
        <form action={loginAccount} className="mt-6">
          <p className="bs-kicker">Existing account</p>
          <label className="mt-5 block text-sm font-medium text-slate-700">Email<input name="email" type="email" required className="bs-field mt-2 w-full" /></label>
          <label className="mt-4 block text-sm font-medium text-slate-700">Password<input name="password" type="password" required className="bs-field mt-2 w-full" /></label>
          <button type="submit" className="bs-button-primary mt-5">Sign in</button>
          <Link href="/account/reset-password" className="mt-3 inline-block text-xs text-slate-500 underline underline-offset-4 hover:text-slate-700">
            Forgot password?
          </Link>
          <div className="my-4 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-bs-border" />or<span className="h-px flex-1 bg-bs-border" /></div>
          <a href="/api/auth/google?intent=signin" className="bs-button-secondary flex w-full justify-center">Login with Google</a>
        </form>
      ) : (
        <form action={registerAccount} className="mt-6">
          <p className="bs-kicker">New workspace</p>
          <label className="mt-5 block text-sm font-medium text-slate-700">Display name<input name="displayName" required minLength={2} className="bs-field mt-2 w-full" /></label>
          <label className="mt-4 block text-sm font-medium text-slate-700">Email<input name="email" type="email" required className="bs-field mt-2 w-full" /></label>
          <label className="mt-4 block text-sm font-medium text-slate-700">Password<input name="password" type="password" required minLength={8} className="bs-field mt-2 w-full" /></label>
          <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-slate-700">
            <input name="acceptTerms" type="checkbox" required className="mt-1 h-4 w-4 shrink-0 rounded border-bs-border" />
            <span>
              I agree to the <Link href="/terms" className="font-medium text-slate-900 underline underline-offset-4">Terms of use</Link> and <Link href="/privacy" className="font-medium text-slate-900 underline underline-offset-4">Privacy policy</Link>.
            </span>
          </label>
          <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-slate-700">
            <input name="acknowledgeDisclaimer" type="checkbox" required className="mt-1 h-4 w-4 shrink-0 rounded border-bs-border" />
            <span>
              I understand the <Link href="/legal-disclaimer" className="font-medium text-slate-900 underline underline-offset-4">legal disclaimer</Link> and that Backer Sonar provides research support, not financial, legal, or performance guarantees.
            </span>
          </label>
          <button type="submit" className="bs-button-primary mt-5">Create account</button>
          <div className="my-4 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-bs-border" />or<span className="h-px flex-1 bg-bs-border" /></div>
          <Link href="/account/google-consent" className="bs-button-secondary inline-flex">Signup with Google</Link>
        </form>
      )}
    </div>
  )
}
