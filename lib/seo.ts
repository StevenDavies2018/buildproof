export const SITE_NAME = 'Backer Sonar'

// Next.js infers og:title/og:description from title/description, but not
// og:type or og:url — both required by the Open Graph spec, and their
// absence is what SEO crawlers flag as "invalid Open Graph". Metadata
// objects don't deep-merge across layout/page boundaries, so every page
// needs its own openGraph.type/url rather than inheriting one from the
// root layout.
export function pageMetadata(path: string) {
  return {
    alternates: { canonical: path },
    openGraph: {
      type: 'website' as const,
      siteName: SITE_NAME,
      url: path,
    },
  }
}
