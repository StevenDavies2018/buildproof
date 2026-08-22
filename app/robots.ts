import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/reports', '/compare', '/admin', '/ai-copilot', '/campaigns/'],
    },
    sitemap: 'https://www.backersonar.com/sitemap.xml',
  }
}
