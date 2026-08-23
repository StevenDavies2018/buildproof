import type { Metadata } from 'next'
import Link from 'next/link'
import { FAQ_ITEMS } from '@/lib/faq'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Common questions about Backer Sonar: pricing, data sources, methodology, and AI Co-Pilot.',
  alternates: { canonical: '/faq' },
}

export default function FaqPage() {
  return (
    <main className="bs-shell">
      <div className="bs-container max-w-4xl gap-5">
        <section className="bs-panel">
          <p className="bs-kicker">FAQ</p>
          <h1 className="bs-title mt-3 text-4xl font-semibold">Common questions.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            How Backer Sonar works, who it&rsquo;s for, and what it costs. Still have a question?{' '}
            <a href="mailto:support@backersonar.com" className="font-medium text-slate-900 underline underline-offset-4">
              Contact support
            </a>.
          </p>
        </section>

        <section className="bs-panel p-5">
          <p className="bs-kicker">How it works</p>
          <h2 className="bs-title mt-2 text-3xl font-semibold">Where the numbers come from.</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Source data</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Campaign history comes from the Web Robots Kickstarter Dataset, a full historical snapshot of
                Kickstarter campaigns &mdash; not a hand-picked sample.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Normalized comparisons</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Goal and pledged amounts are converted to USD so campaigns launched in different currencies can be
                compared on the same basis, with confidence noted per campaign.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Deterministic calculations</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Success rates, medians, and funding multiples are computed directly from source records. The same
                filters always produce the same numbers &mdash; nothing is model-generated.
              </p>
            </div>
          </div>
        </section>

        <section className="bs-panel p-5">
          <p className="bs-kicker">Who it&rsquo;s for</p>
          <h2 className="bs-title mt-2 text-3xl font-semibold">Research for wherever you are in the process.</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Researching feasibility</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Check how campaigns like yours have historically performed before committing time to a launch.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Optimizing a launch</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Compare goal size, duration, and category signals across comparable campaigns to calibrate your own.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Evaluating for a client</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Save research views and comparisons you can revisit and share as part of client due diligence.
              </p>
            </div>
          </div>
        </section>

        <section className="bs-panel p-5">
          <p className="bs-kicker">Known limitations</p>
          <h2 className="bs-title mt-2 text-3xl font-semibold">We surface what we&rsquo;re unsure of.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Historical data may contain source limitations, missing fields, classification edge cases, or incomplete
            currency comparability. Where those limitations are known, Backer Sonar surfaces them as warnings or
            confidence signals in the workspace rather than presenting every number with equal certainty. Full detail
            is in the <Link href="/legal-disclaimer" className="font-medium text-slate-900 underline underline-offset-4">legal disclaimer</Link>.
          </p>
        </section>

        <section className="bs-panel">
          <p className="bs-kicker">Questions</p>
          <h2 className="bs-title mt-2 text-3xl font-semibold">Pricing, AI Co-Pilot, and cancellation.</h2>
          <div className="mt-6 grid gap-6">
            {FAQ_ITEMS.map((item) => (
              <div key={item.question} className="border-b border-bs-border pb-6 last:border-b-0 last:pb-0">
                <h3 className="text-lg font-semibold text-slate-900">{item.question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
              </div>
            ))}
          </div>
          <Link href="/" className="bs-button-secondary mt-8 inline-flex">Back to Backer Sonar</Link>
        </section>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ_ITEMS.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
              },
            })),
          }),
        }}
      />
    </main>
  )
}
