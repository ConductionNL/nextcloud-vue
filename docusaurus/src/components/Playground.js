/**
 * Playground — embeds the Vue Styleguidist build for one component as an
 * iframe so docs pages can show a live, interactive demo without coupling
 * the Vue 2.7 lib to Docusaurus's React/MDX 3 runtime.
 *
 * Usage in MDX:
 *
 *     import Playground from '@site/src/components/Playground'
 *
 *     <Playground component="CnDataTable" />
 *     <Playground component="CnIndexPage" path="#!/CnIndexPage/usage" height="640px" />
 *
 * Iframe target:
 *   - In production deploys, the Styleguidist build is copied into
 *     `gh-pages:/styleguide/` by `.github/workflows/documentation.yml`,
 *     so `/styleguide/#!/<name>` resolves on the same origin.
 *   - In local `npm start`, point the styleguide URL at a separate dev
 *     server (default `http://localhost:6060`) — Vue Styleguidist's own
 *     `npm run server` from `styleguide/`. Configure via the
 *     `themeConfig.playground.styleguideUrl` option in
 *     `docusaurus.config.js`, or override per-page via the `baseUrl`
 *     prop.
 *
 * Auto-resize: the iframe listens for a `playground:resize` postMessage
 * (`{ type: 'playground:resize', height: number }`) from the styleguide
 * frame and adjusts its height. Best-effort — if no message arrives, the
 * default `height` prop value is used.
 */

import React, { useEffect, useRef, useState } from 'react'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import BrowserOnly from '@docusaurus/BrowserOnly'

const DEFAULT_HEIGHT = '480px'
const DEFAULT_BASE_URL = '/styleguide'

function PlaygroundInner({ component, path, height, baseUrl, caption }) {
  const iframeRef = useRef(null)
  const [resolvedHeight, setResolvedHeight] = useState(height || DEFAULT_HEIGHT)

  // Resolve the styleguide base URL: explicit prop > themeConfig > default.
  // useDocusaurusContext can throw if called too early in some edge cases —
  // wrap defensively so a misconfig never crashes the docs page.
  let configuredBaseUrl = DEFAULT_BASE_URL
  try {
    const ctx = useDocusaurusContext()
    configuredBaseUrl = ctx?.siteConfig?.themeConfig?.playground?.styleguideUrl || DEFAULT_BASE_URL
  } catch (_e) {
    // Fall through to default
  }
  const effectiveBase = (baseUrl ?? configuredBaseUrl).replace(/\/$/, '')

  const effectivePath = path ?? `/#!/${component}`
  const src = `${effectiveBase}${effectivePath}`

  useEffect(() => {
    function onMessage(event) {
      // Don't trust cross-origin senders we didn't ask for.
      if (event.source !== iframeRef.current?.contentWindow) return
      const { data } = event
      if (data && data.type === 'playground:resize' && typeof data.height === 'number') {
        setResolvedHeight(`${Math.max(240, Math.min(1200, data.height))}px`)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <figure className="playground" style={{ margin: '1.5rem 0' }}>
      <iframe
        ref={iframeRef}
        src={src}
        title={`${component} live demo`}
        loading="lazy"
        style={{
          width: '100%',
          height: resolvedHeight,
          border: '1px solid var(--ifm-color-emphasis-300)',
          borderRadius: 'var(--ifm-card-border-radius, 8px)',
          background: 'var(--ifm-background-surface-color)',
        }}
      />
      <figcaption
        style={{
          marginTop: '0.5rem',
          fontSize: '0.85rem',
          color: 'var(--ifm-color-emphasis-700)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <span>{caption || `Live demo of ${component} (Vue Styleguidist).`}</span>
        <a href={src} target="_blank" rel="noopener noreferrer">
          Open standalone ↗
        </a>
      </figcaption>
    </figure>
  )
}

/**
 * BrowserOnly guard — `useEffect` + `window.addEventListener` need a real
 * DOM. Without this wrapper, Docusaurus's static-site generation step
 * tries to render the component server-side and fails.
 */
export default function Playground(props) {
  return (
    <BrowserOnly fallback={
      <div style={{
        width: '100%',
        height: props.height || DEFAULT_HEIGHT,
        border: '1px solid var(--ifm-color-emphasis-300)',
        borderRadius: 'var(--ifm-card-border-radius, 8px)',
        background: 'var(--ifm-background-surface-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--ifm-color-emphasis-600)',
        margin: '1.5rem 0',
      }}>
        Loading {props.component} playground…
      </div>
    }>
      {() => <PlaygroundInner {...props} />}
    </BrowserOnly>
  )
}
