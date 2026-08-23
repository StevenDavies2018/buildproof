import type { Metadata } from 'next'
import Link from 'next/link'
import { FAQ_ITEMS } from '@/lib/faq'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Common questions about Backer Sonar: pricing, data sources, AI Co-Pilot, and cancellation.',
  alternates: { canonical: '/faq' },
}

export default function FaqPage() {
  return (
    <main className="bs-shell">
      <div className="bs-container max-w-4xl">
        <article className="bs-panel">
          <p className="bs-kicker">FAQ</p>
          <h1 className="bs-title mt-3 text-4xl font-semibold">Common questions.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            Answers about pricing, data sources, and how Backer Sonar works. Still have a question?{' '}
            <a href="mailto:support@backersonar.com" className="font-medium text-slate-900 underline underline-offset-4">
              Contact support
            </a>.
          </p>
          <div className="mt-8 grid gap-6">
            {FAQ_ITEMS.map((item) => (
              <div key={item.question} className="border-b border-bs-border pb-6 last:border-b-0 last:pb-0">
                <h2 className="text-lg font-semibold text-slate-900">{item.question}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
              </div>
            ))}
          </div>
          <Link href="/" className="bs-button-secondary mt-8 inline-flex">Back to Backer Sonar</Link>
        </article>
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
