/**
 * Stub redirect for the brand footer's "Privacy" link.
 *
 * The brand Footer swizzle in @conduction/docusaurus-preset hard-codes
 * <Link to="/privacy">, /terms, /iso etc. — the canonical pages live
 * on conduction.nl. We stub these routes locally so the build's
 * broken-link checker resolves them, then send the user to the real
 * page on first paint.
 *
 * Same pattern in /terms.jsx and /iso.jsx.
 */
import React from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'

const TARGET = 'https://conduction.nl/privacy'

export default function Privacy() {
  return (
    <BrowserOnly fallback={<RedirectNotice />}>
      {() => {
        if (typeof window !== 'undefined') {
          window.location.replace(TARGET)
        }
        return <RedirectNotice />
      }}
    </BrowserOnly>
  )
}

function RedirectNotice() {
  return (
    <main style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
      <h1>Privacy</h1>
      <p>
        This page lives on <a href={TARGET}>conduction.nl/privacy</a>.
        Redirecting…
      </p>
    </main>
  )
}
