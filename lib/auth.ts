import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { getSql, hasDatabaseConfig } from '@/lib/db'
import { Resend } from 'resend'

const SESSION_COOKIE = 'backer-sonar-session'
const SESSION_DAYS = 30

export type AuthUser = {
  id: number
  email: string
  displayName: string
  role: 'user' | 'admin'
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
  const baseUrl = process.env.APP_URL ?? 'http://localhost:3000'
  const resend = new Resend(process.env.RESEND_API_KEY)
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify your Backer Sonar account',
    html: `<p>Hi ${displayName},</p><p>Verify your Backer Sonar account by clicking the link below:</p><p><a href="${baseUrl}/account/verify?token=${token}">Verify my email address</a></p><p>This link expires in 24 hours.</p>`,
  })
  if (result.error) throw new Error('Verification email could not be sent')
}

function sessionExpiry() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
}

export async function createAccount(email: string, displayName: string, password: string) {
  if (!hasDatabaseConfig()) throw new Error('Database is not configured')
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail || !normalizedEmail.includes('@')) throw new Error('Enter a valid email address')
  if (displayName.trim().length < 2) throw new Error('Enter a display name')
  if (password.length < 8) throw new Error('Password must be at least 8 characters')

  const sql = getSql()
  const [user] = await sql<{ id: number; email: string; displayName: string; role: 'user' | 'admin' }[]>`
    INSERT INTO app_users (email, display_name, password_hash)
    VALUES (${normalizedEmail}, ${displayName.trim()}, ${hashPassword(password)})
    RETURNING id, email, display_name AS "displayName", role
  `
  await sendVerificationEmail(user.id, user.email, user.displayName)
  return { ...user, emailVerified: false }
}

export async function signIn(email: string, password: string) {
  if (!hasDatabaseConfig()) throw new Error('Database is not configured')
  const sql = getSql()
  const [user] = await sql<{ id: number; email: string; displayName: string; passwordHash: string; role: 'user' | 'admin'; emailVerifiedAt: string | null }[]>`
    SELECT id, email, display_name AS "displayName", password_hash AS "passwordHash", role, email_verified_at AS "emailVerifiedAt"
    FROM app_users
    WHERE email = ${normalizeEmail(email)}
    LIMIT 1
  `
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error('Email or password is incorrect')
  }
  if (!user.emailVerifiedAt) throw new Error('Verify your email before signing in')
  await establishSession(user.id)
  return { id: user.id, email: user.email, displayName: user.displayName, role: user.role }
}

export async function signInWithGoogle(subject: string, email: string, displayName: string) {
  if (!hasDatabaseConfig()) throw new Error('Database is not configured')
  const sql = getSql()
  const normalizedEmail = normalizeEmail(email)
  const [existing] = await sql<{ id: number }[]>`
    SELECT id FROM app_users
    WHERE google_subject = ${subject} OR email = ${normalizedEmail}
    LIMIT 1
  `
  const [user] = existing
    ? await sql<{ id: number; email: string; displayName: string; role: 'user' | 'admin' }[]>`
        UPDATE app_users
        SET email = ${normalizedEmail}, display_name = ${displayName.trim() || email}, google_subject = ${subject}, email_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${existing.id}
        RETURNING id, email, display_name AS "displayName", role
      `
    : await sql<{ id: number; email: string; displayName: string; role: 'user' | 'admin' }[]>`
        INSERT INTO app_users (email, display_name, password_hash, google_subject, email_verified_at)
        VALUES (${normalizedEmail}, ${displayName.trim() || email}, ${hashPassword(randomBytes(32).toString('hex'))}, ${subject}, CURRENT_TIMESTAMP)
        RETURNING id, email, display_name AS "displayName", role
      `
  await establishSession(user.id)
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
    expires: expiresAt,
  })
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!hasDatabaseConfig()) return null
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null

  const sql = getSql()
  const [user] = await sql<AuthUser[]>`
    SELECT u.id, u.email, u.display_name AS "displayName", u.role
    FROM app_sessions s
    INNER JOIN app_users u ON u.id = s.user_id
    WHERE s.token_hash = ${hashSessionToken(token)}
      AND s.expires_at > CURRENT_TIMESTAMP
    LIMIT 1
  `
  return user ?? null
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
}

export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    const { redirect } = await import('next/navigation')
    redirect('/account?error=Admin%20access%20required')
  }
  return user
}

export async function signOut() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token && hasDatabaseConfig()) {
    await getSql()`
      DELETE FROM app_sessions WHERE token_hash = ${hashSessionToken(token)}
    `
  }
  cookieStore.delete(SESSION_COOKIE)
}
