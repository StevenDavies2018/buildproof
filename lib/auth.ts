import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { recordAnalyticsEvent } from '@/lib/analytics'
import { getSql, hasDatabaseConfig } from '@/lib/db'
import { Resend } from 'resend'

const SESSION_COOKIE = 'backer-sonar-session'
const SESSION_DAYS = 30

async function getClientIp() {
  const headerList = await headers()
  return headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

// Sliding-window rate limiter backed by Postgres rather than a new Redis/KV
// dependency — fine at this traffic level; an indexed count-then-insert on a
// small table is cheap next to the query this app already runs on every
// dashboard/report view. Fails open (returns true) if the DB isn't
// configured, matching how the rest of auth.ts degrades without a database.
async function checkRateLimit(bucket: string, maxAttempts: number, windowMinutes: number) {
  if (!hasDatabaseConfig()) return true
  const sql = getSql()
  const [{ count }] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM auth_rate_limit_events
    WHERE bucket = ${bucket}
      AND occurred_at > CURRENT_TIMESTAMP - (${windowMinutes} || ' minutes')::interval
  `
  if (count >= maxAttempts) return false
  await sql`INSERT INTO auth_rate_limit_events (bucket) VALUES (${bucket})`
  // Opportunistic cleanup instead of on every call — keeps the table small
  // without an extra DELETE round-trip on the hot path.
  if (Math.random() < 0.05) {
    await sql`DELETE FROM auth_rate_limit_events WHERE occurred_at < CURRENT_TIMESTAMP - INTERVAL '1 day'`
  }
  return true
}

export type AuthUser = {
  id: number
  email: string
  displayName: string
  role: 'user' | 'admin'
  accountType: 'free' | 'paid'
  trialEndsAt: string | null
  aiCopilotEnabled: boolean
  aiCopilotEnabledAt: string | null
}

export type UserEntitlements = {
  canUseResearchSurfaces: boolean
  canUseAiCopilot: boolean
  saveLimits: {
    research: number | null
    campaign: number | null
    comparison: number | null
  }
  compareSelectionLimit: number
}

export type AccountConsent = {
  acceptedTerms: boolean
  acknowledgedDisclaimer: boolean
}

type GoogleRegistrationConsent = {
  termsAcceptedAt: Date
  privacyAcceptedAt: Date
  legalDisclaimerAcknowledgedAt: Date
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function hashPassword(password: string) {
  const salt = randomBytes(16)
  const derived = scryptSync(password, salt, 64)
  return `${salt.toString('hex')}:${derived.toString('hex')}`
}

function verifyPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false

  try {
    const expected = Buffer.from(hashHex, 'hex')
    const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function verificationExpiry() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000)
}

async function sendVerificationEmail(userId: number, email: string, displayName: string) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error('Email verification is not configured yet')
  }
  const token = randomBytes(32).toString('base64url')
  const sql = getSql()
  await sql`DELETE FROM email_verification_tokens WHERE user_id = ${userId} AND used_at IS NULL`
  await sql`
    INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
    VALUES (${userId}, ${hashSessionToken(token)}, ${verificationExpiry()})
  `
  // `||`, not `??` — APP_URL can be present but set to an empty string,
  // which would otherwise silently produce a relative link inside the
  // verification email (broken outside a browser's page context).
  const baseUrl = process.env.APP_URL || 'http://localhost:3000'
  const resend = new Resend(process.env.RESEND_API_KEY)
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify your Backer Sonar account',
    html: `<p>Hi ${displayName},</p><p>Verify your Backer Sonar account by clicking the link below:</p><p><a href="${baseUrl}/account/verify?token=${token}">Verify my email address</a></p><p>This link expires in 24 hours.</p>`,
  })
  if (result.error) throw new Error('Verification email could not be sent')
}

// Best-effort — a failed notification shouldn't block a real user's signup,
// so this only logs on failure rather than throwing.
async function notifyAdminOfSignup(email: string, displayName: string, method: 'email' | 'google') {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !adminEmail) return
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: adminEmail,
      subject: 'New Backer Sonar signup',
      html: `<p>New account created via ${method === 'google' ? 'Google sign-in' : 'email/password'}:</p><p>${displayName} &lt;${email}&gt;</p>`,
    })
  } catch (error) {
    console.error('Signup notification email failed', error)
  }
}

async function sendPasswordResetEmail(userId: number, email: string, displayName: string) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error('Password reset email is not configured yet')
  }
  const token = randomBytes(32).toString('base64url')
  const sql = getSql()
  await sql`DELETE FROM password_reset_tokens WHERE user_id = ${userId} AND used_at IS NULL`
  await sql`
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (${userId}, ${hashSessionToken(token)}, ${verificationExpiry()})
  `
  const baseUrl = process.env.APP_URL || 'http://localhost:3000'
  const resend = new Resend(process.env.RESEND_API_KEY)
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Reset your Backer Sonar password',
    html: `<p>Hi ${displayName},</p><p>Reset your Backer Sonar password by clicking the link below:</p><p><a href="${baseUrl}/account/reset-password?token=${token}">Reset my password</a></p><p>This link expires in 24 hours. If you didn't request this, you can ignore this email.</p>`,
  })
  if (result.error) throw new Error('Password reset email could not be sent')
}

export async function requestPasswordReset(email: string) {
  if (!hasDatabaseConfig()) throw new Error('Database is not configured')
  const normalizedEmail = normalizeEmail(email)
  const ip = await getClientIp()
  if (!(await checkRateLimit(`reset-request:${normalizedEmail}`, 3, 60))) {
    throw new Error('Too many reset attempts. Please try again later.')
  }
  if (!(await checkRateLimit(`reset-request-ip:${ip}`, 10, 60))) {
    throw new Error('Too many reset attempts. Please try again later.')
  }

  const sql = getSql()
  const [user] = await sql<{ id: number; email: string; displayName: string; googleSubject: string | null }[]>`
    SELECT id, email, display_name AS "displayName", google_subject AS "googleSubject"
    FROM app_users
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `
  // Same outcome whether the account doesn't exist or is Google-only --
  // avoids confirming which emails have accounts, and a Google-only account
  // has no password to reset via this flow.
  if (!user || user.googleSubject) return
  await sendPasswordResetEmail(user.id, user.email, user.displayName)
}

export async function resetPassword(token: string, newPassword: string) {
  if (!hasDatabaseConfig()) throw new Error('Database is not configured')
  if (newPassword.length < 8) throw new Error('Password must be at least 8 characters')

  const sql = getSql()
  const [row] = await sql<{ userId: number }[]>`
    SELECT user_id AS "userId"
    FROM password_reset_tokens
    WHERE token_hash = ${hashSessionToken(token)}
      AND used_at IS NULL
      AND expires_at > CURRENT_TIMESTAMP
    LIMIT 1
  `
  if (!row) throw new Error('This password reset link is invalid or expired')

  await sql.begin(async (transaction) => {
    await transaction`
      UPDATE app_users
      SET password_hash = ${hashPassword(newPassword)}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${row.userId}
    `
    await transaction`UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_hash = ${hashSessionToken(token)}`
    // A password reset should sign out every existing session, the same way
    // updateManagedAccountPassword() does for an admin-initiated reset.
    await transaction`DELETE FROM app_sessions WHERE user_id = ${row.userId}`
  })
}

export async function resendVerificationEmail(email: string) {
  if (!hasDatabaseConfig()) throw new Error('Database is not configured')
  const normalizedEmail = normalizeEmail(email)
  const ip = await getClientIp()
  if (!(await checkRateLimit(`resend-verify:${normalizedEmail}`, 3, 60))) {
    throw new Error('Too many resend attempts. Please try again later.')
  }
  if (!(await checkRateLimit(`resend-verify-ip:${ip}`, 10, 60))) {
    throw new Error('Too many resend attempts. Please try again later.')
  }

  const sql = getSql()
  const [user] = await sql<{ id: number; email: string; displayName: string; emailVerifiedAt: string | null }[]>`
    SELECT id, email, display_name AS "displayName", email_verified_at AS "emailVerifiedAt"
    FROM app_users
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `
  // Same outcome whether the account doesn't exist or is already verified --
  // avoids confirming which emails have accounts on this endpoint.
  if (!user || user.emailVerifiedAt) return
  await sendVerificationEmail(user.id, user.email, user.displayName)
}

function sessionExpiry() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
}

export async function createAccount(
  email: string,
  displayName: string,
  password: string,
  consent: AccountConsent,
) {
  if (!hasDatabaseConfig()) throw new Error('Database is not configured')
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail || !normalizedEmail.includes('@')) throw new Error('Enter a valid email address')
  if (displayName.trim().length < 2) throw new Error('Enter a display name')
  if (password.length < 8) throw new Error('Password must be at least 8 characters')
  if (!consent.acceptedTerms) throw new Error('Terms consent is required')
  if (!consent.acknowledgedDisclaimer) throw new Error('Legal disclaimer acknowledgement is required')

  const ip = await getClientIp()
  if (!(await checkRateLimit(`register-ip:${ip}`, 5, 60))) {
    throw new Error('Too many signup attempts. Please try again later.')
  }

  const sql = getSql()
  // trial_ends_at is set explicitly here rather than relying on the column
  // default — that default only exists in the CREATE TABLE clause, which
  // never runs against an already-existing table, so a column added later
  // via ALTER TABLE ADD COLUMN has no default and would otherwise insert
  // NULL, making every new account look like an already-expired trial.
  const [user] = await sql<{ id: number; email: string; displayName: string; role: 'user' | 'admin' }[]>`
    INSERT INTO app_users (
      email,
      display_name,
      password_hash,
      terms_accepted_at,
      privacy_accepted_at,
      legal_disclaimer_acknowledged_at,
      trial_ends_at
    )
    VALUES (
      ${normalizedEmail},
      ${displayName.trim()},
      ${hashPassword(password)},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP + INTERVAL '7 days'
    )
    RETURNING id, email, display_name AS "displayName", role
  `
  await sendVerificationEmail(user.id, user.email, user.displayName)
  void notifyAdminOfSignup(user.email, user.displayName, 'email')
  await recordAnalyticsEvent({
    userId: user.id,
    eventName: 'account_created',
    surface: 'account',
  })
  return { ...user, emailVerified: false }
}

export async function signIn(email: string, password: string) {
  if (!hasDatabaseConfig()) throw new Error('Database is not configured')

  const normalizedEmail = normalizeEmail(email)
  const ip = await getClientIp()
  // Two buckets: a tight per-account limit (stops brute-forcing one email)
  // and a looser per-IP limit (stops spraying many emails from one source).
  const [accountOk, ipOk] = await Promise.all([
    checkRateLimit(`login-account:${normalizedEmail}`, 8, 15),
    checkRateLimit(`login-ip:${ip}`, 25, 15),
  ])
  if (!accountOk || !ipOk) {
    throw new Error('Too many sign-in attempts. Please try again in a few minutes.')
  }

  const sql = getSql()
  const [user] = await sql<{ id: number; email: string; displayName: string; passwordHash: string; role: 'user' | 'admin'; emailVerifiedAt: string | null; accountType: 'free' | 'paid'; trialEndsAt: string | null }[]>`
    SELECT id, email, display_name AS "displayName", password_hash AS "passwordHash", role, email_verified_at AS "emailVerifiedAt", account_type AS "accountType", trial_ends_at AS "trialEndsAt"
    FROM app_users
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error('Email or password is incorrect')
  }
  if (!user.emailVerifiedAt) throw new Error('Verify your email before signing in')
  await establishSession(user.id)
  await recordAnalyticsEvent({
    userId: user.id,
    eventName: 'sign_in',
    surface: 'account',
  })
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    accountType: user.accountType,
    trialEndsAt: user.trialEndsAt,
  }
}

export async function signInWithGoogle(
  subject: string,
  email: string,
  displayName: string,
  registrationConsent?: GoogleRegistrationConsent,
) {
  if (!hasDatabaseConfig()) throw new Error('Database is not configured')
  const sql = getSql()
  const normalizedEmail = normalizeEmail(email)
  const [existing] = await sql<{ id: number }[]>`
    SELECT id FROM app_users
    WHERE google_subject = ${subject} OR email = ${normalizedEmail}
    LIMIT 1
  `
  const [user] = existing
    ? await sql<{ id: number; email: string; displayName: string; role: 'user' | 'admin'; accountType: 'free' | 'paid'; trialEndsAt: string | null }[]>`
        UPDATE app_users
        SET email = ${normalizedEmail}, display_name = ${displayName.trim() || email}, google_subject = ${subject}, email_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${existing.id}
        RETURNING id, email, display_name AS "displayName", role, account_type AS "accountType", trial_ends_at AS "trialEndsAt"
      `
    : await sql<{ id: number; email: string; displayName: string; role: 'user' | 'admin'; accountType: 'free' | 'paid'; trialEndsAt: string | null }[]>`
        INSERT INTO app_users (
          email,
          display_name,
          password_hash,
          google_subject,
          email_verified_at,
          terms_accepted_at,
          privacy_accepted_at,
          legal_disclaimer_acknowledged_at,
          trial_ends_at
        )
        VALUES (
          ${normalizedEmail},
          ${displayName.trim() || email},
          ${hashPassword(randomBytes(32).toString('hex'))},
          ${subject},
          CURRENT_TIMESTAMP,
          ${registrationConsent?.termsAcceptedAt ?? null},
          ${registrationConsent?.privacyAcceptedAt ?? null},
          ${registrationConsent?.legalDisclaimerAcknowledgedAt ?? null},
          CURRENT_TIMESTAMP + INTERVAL '7 days'
        )
        RETURNING id, email, display_name AS "displayName", role, account_type AS "accountType", trial_ends_at AS "trialEndsAt"
      `
  await establishSession(user.id)
  if (!existing) void notifyAdminOfSignup(user.email, user.displayName, 'google')
  await recordAnalyticsEvent({
    userId: user.id,
    eventName: 'sign_in',
    surface: 'google-auth',
  })
  return user
}

async function establishSession(userId: number) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = sessionExpiry()
  const sql = getSql()
  await sql`
    DELETE FROM app_sessions
    WHERE user_id = ${userId} OR expires_at < CURRENT_TIMESTAMP
  `
  await sql`
    INSERT INTO app_sessions (user_id, token_hash, expires_at)
    VALUES (${userId}, ${hashSessionToken(token)}, ${expiresAt})
  `
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // No `expires`/`maxAge` — this makes it a browser-session cookie, so
    // the browser discards it when fully closed (not just the tab). The
    // DB row's expiresAt (30 days) still bounds the session server-side as
    // a backstop for anyone whose browser restores cookies on restart.
  })
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!hasDatabaseConfig()) return null
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null

  const sql = getSql()
  const [user] = await sql<AuthUser[]>`
    SELECT
      u.id,
      u.email,
      u.display_name AS "displayName",
      u.role,
      u.account_type AS "accountType",
      u.trial_ends_at AS "trialEndsAt",
      u.ai_copilot_enabled AS "aiCopilotEnabled",
      u.ai_copilot_enabled_at AS "aiCopilotEnabledAt"
    FROM app_sessions s
    INNER JOIN app_users u ON u.id = s.user_id
    WHERE s.token_hash = ${hashSessionToken(token)}
      AND s.expires_at > CURRENT_TIMESTAMP
    LIMIT 1
  `
  return user ?? null
}

export function isTrialExpired(user: Pick<AuthUser, 'role' | 'accountType' | 'trialEndsAt'>) {
  if (user.role === 'admin' || user.accountType === 'paid') return false
  if (!user.trialEndsAt) return true
  const trialEndsAt = new Date(user.trialEndsAt)
  if (Number.isNaN(trialEndsAt.valueOf())) return true
  return trialEndsAt.getTime() <= Date.now()
}

export function getTrialDaysRemaining(user: Pick<AuthUser, 'role' | 'accountType' | 'trialEndsAt'>) {
  if (user.role === 'admin' || user.accountType === 'paid') return null
  if (!user.trialEndsAt) return 0
  const trialEndsAt = new Date(user.trialEndsAt)
  if (Number.isNaN(trialEndsAt.valueOf())) return 0
  return Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000))
}

export function getUserEntitlements(
  user: Pick<AuthUser, 'role' | 'accountType' | 'trialEndsAt'>,
): UserEntitlements {
  if (user.role === 'admin') {
    return {
      canUseResearchSurfaces: true,
      canUseAiCopilot: true,
      saveLimits: {
        research: null,
        campaign: null,
        comparison: null,
      },
      compareSelectionLimit: 4,
    }
  }

  if (user.accountType === 'paid') {
    return {
      canUseResearchSurfaces: true,
      canUseAiCopilot: true,
      saveLimits: {
        research: null,
        campaign: null,
        comparison: null,
      },
      compareSelectionLimit: 4,
    }
  }

  if (isTrialExpired(user)) {
    return {
      canUseResearchSurfaces: false,
      canUseAiCopilot: false,
      saveLimits: {
        research: 5,
        campaign: 15,
        comparison: 5,
      },
      compareSelectionLimit: 2,
    }
  }

  return {
    canUseResearchSurfaces: true,
    canUseAiCopilot: false,
    saveLimits: {
      research: 5,
      campaign: 15,
      comparison: 5,
    },
    compareSelectionLimit: 2,
  }
}

export async function requireSignedInUser(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    const { redirect } = await import('next/navigation')
    redirect('/account?error=Sign%20in%20is%20required')
  }
  return user as AuthUser
}

export async function requireActivePlan(redirectTo = '/account?error=Your%20free%20trial%20has%20ended') {
  const user = await requireSignedInUser()
  if (isTrialExpired(user)) {
    const { redirect } = await import('next/navigation')
    redirect(redirectTo)
  }
  return user
}

export async function requireAiCopilotAccess() {
  const user = await requireActivePlan(
    '/account?error=Your%20free%20trial%20has%20ended.%20Upgrade%20to%20keep%20using%20AI%20Co-Pilot.',
  )
  const entitlements = getUserEntitlements(user)
  if (!entitlements.canUseAiCopilot) {
    const { redirect } = await import('next/navigation')
    redirect('/account?error=AI%20Co-Pilot%20is%20included%20in%20the%20Paid%20plan')
  }
  if (!user.aiCopilotEnabled) {
    const { redirect } = await import('next/navigation')
    redirect('/account?error=Enable%20AI%20Co-Pilot%20in%20Account%20settings%20first')
  }
  return user
}

export async function setAiCopilotEnabled(userId: number, enabled: boolean) {
  if (!hasDatabaseConfig()) throw new Error('Database is not configured')
  const sql = getSql()
  if (enabled) {
    // Only stamp the acknowledgment date the first time it's turned on —
    // later on/off toggling shouldn't overwrite the original consent date.
    await sql`
      UPDATE app_users
      SET
        ai_copilot_enabled = true,
        ai_copilot_enabled_at = COALESCE(ai_copilot_enabled_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `
  } else {
    await sql`
      UPDATE app_users
      SET ai_copilot_enabled = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `
  }
}

export async function verifyEmail(token: string) {
  if (!hasDatabaseConfig()) throw new Error('Database is not configured')
  const sql = getSql()
  const [row] = await sql<{ userId: number }[]>`
    SELECT user_id AS "userId"
    FROM email_verification_tokens
    WHERE token_hash = ${hashSessionToken(token)}
      AND used_at IS NULL
      AND expires_at > CURRENT_TIMESTAMP
    LIMIT 1
  `
  if (!row) throw new Error('This verification link is invalid or expired')
  await sql.begin(async (transaction) => {
    await transaction`UPDATE app_users SET email_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ${row.userId}`
    await transaction`UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_hash = ${hashSessionToken(token)}`
  })
  await recordAnalyticsEvent({
    userId: row.userId,
    eventName: 'email_verified',
    surface: 'account',
  })
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    const { redirect } = await import('next/navigation')
    redirect('/account?error=Admin%20access%20required')
  }
  return user as AuthUser
}

export async function signOut() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token && hasDatabaseConfig()) {
    const user = await getCurrentUser()
    await getSql()`
      DELETE FROM app_sessions WHERE token_hash = ${hashSessionToken(token)}
    `
    await recordAnalyticsEvent({
      userId: user?.id ?? null,
      eventName: 'sign_out',
      surface: 'account',
    })
  }
  cookieStore.delete(SESSION_COOKIE)
}
