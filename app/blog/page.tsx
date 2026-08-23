import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPostMeta } from '@/lib/blog'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Data-driven Kickstarter research: what the historical dataset actually shows about goal size, campaign length, and category performance.',
  alternates: { canonical: '/blog' },
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date)
}

export default function BlogIndexPage() {
  const posts = getAllPostMeta()

  return (
    <main className="bs-shell">
      <div className="bs-container max-w-4xl">
        <section className="bs-panel">
          <p className="bs-kicker">Blog</p>
          <h1 className="bs-title mt-3 text-4xl font-semibold">Kickstarter research, backed by data.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            Deterministic breakdowns from Backer Sonar&rsquo;s full Kickstarter dataset &mdash; no invented statistics,
            just what the historical record actually shows.
          </p>
        </section>

        <section className="mt-6 grid gap-4">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="bs-panel-subtle block transition hover:-translate-y-0.5 hover:border-sky-400"
            >
              <p className="text-xs text-slate-500">{formatDate(post.publishedAt)}</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">{post.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{post.description}</p>
            </Link>
          ))}
          {!posts.length ? (
            <div className="bs-panel-subtle text-sm text-slate-600">No articles published yet.</div>
          ) : null}
        </section>

        <div className="mt-8">
          <Link href="/" className="bs-button-secondary inline-flex">Back to Backer Sonar</Link>
        </div>
      </div>
    </main>
  )
}
