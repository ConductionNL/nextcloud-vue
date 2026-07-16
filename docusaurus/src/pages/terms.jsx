/**
 * Stub redirect for the brand footer's "Terms" link. See privacy.jsx
 * for the rationale.
 */
import React from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'

const TARGET = 'https://conduction.nl/terms'

export default function Terms() {
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
      <h1>Terms</h1>
      <p>
        This page lives on <a href={TARGET}>conduction.nl/terms</a>.
        Redirecting…
      </p>
    </main>
  )
}
