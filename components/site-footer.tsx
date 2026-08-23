import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="border-t border-bs-border px-6 py-7 md:px-10 lg:px-14">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-[color:var(--bs-text-strong)]">Backer Sonar (C) 2026</p>
          <p className="mt-1 text-xs">Evidence-first Kickstarter research.</p>
        </div>
        <nav aria-label="Legal and support links" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/blog" className="hover:text-[color:var(--bs-text-strong)]">Blog</Link>
          <Link href="/faq" className="hover:text-[color:var(--bs-text-strong)]">FAQ</Link>
          <Link href="/privacy" className="hover:text-[color:var(--bs-text-strong)]">Privacy</Link>
          <Link href="/terms" className="hover:text-[color:var(--bs-text-strong)]">Terms</Link>
          <Link href="/cookies" className="hover:text-[color:var(--bs-text-strong)]">Cookies</Link>
          <Link href="/acceptable-use" className="hover:text-[color:var(--bs-text-strong)]">Acceptable use</Link>
          <Link href="/accessibility" className="hover:text-[color:var(--bs-text-strong)]">Accessibility</Link>
          <a href="mailto:support@backersonar.com" className="hover:text-[color:var(--bs-text-strong)]">Support</a>
        </nav>
      </div>
    </footer>
  )
}
