'use client'
import { usePathname } from 'next/navigation'
import Script from 'next/script'

const EXCLUDED = ['/admin', '/404', '/_not-found']

export default function AdsenseLoader() {
  const pathname = usePathname()
  if (!pathname || EXCLUDED.some(p => pathname === p || pathname.startsWith(p + '/'))) return null
  return (
    <Script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9871252905587015"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  )
}
