/**
 * Stub redirect for the brand footer's ISO certification badges (and
 * the "ISO" text link). See privacy.jsx for the rationale.
 */
import React from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'

const TARGET = 'https://conduction.nl/iso'

export default function Iso() {
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
      <h1>ISO certification</h1>
      <p>
        Conduction's ISO 9001:2015 + 27001:2022 certification details
        live on <a href={TARGET}>conduction.nl/iso</a>. Redirecting…
      </p>
    </main>
  )
}
