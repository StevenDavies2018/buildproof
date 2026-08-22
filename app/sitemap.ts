import type { MetadataRoute } from 'next'

const BASE_URL = 'https://www.backersonar.com'

const PUBLIC_PATHS = [
  '/',
  '/terms',
  '/privacy',
  '/cookies',
  '/acceptable-use',
  '/accessibility',
  '/legal-disclaimer',
  '/account',
]

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
  }))
}
