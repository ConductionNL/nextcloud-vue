/**
 * Homepage for nextcloud-vue.conduction.nl.
 *
 * Layout: cobalt-blue hero block + <Section/> with a four-card widget
 * grid linking into the four hub topics — same shape used on
 * conduction.nl, openregister.conduction.nl, and procest.conduction.nl.
 *
 * Why a custom hero JSX instead of the preset's <Hero/>:
 *   The preset's <Hero/> uses dark text on a light section bg by
 *   design. We want the openregister.conduction.nl look — cobalt-blue
 *   bg with white type — so we hand-roll a minimal hero block that
 *   reuses the brand tokens (--c-blue-cobalt, --c-cobalt-100, etc.)
 *   and the preset's <Button/> primitive for the CTAs.
 *
 * Each card is a deeplink into a topic hub:
 *   1. App design principles  → /docs/architecture/app-design-principles
 *   2. App manifest           → /docs/architecture/manifest
 *   3. Schemas and registers  → /docs/architecture/schemas-and-registers
 *   4. Components             → /docs/components
 */

import React from 'react'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import {
  Section,
  SectionHead,
  Card,
  Button,
  Eyebrow,
} from '@conduction/docusaurus-preset/components'

const CARDS = [
  {
    eyebrow: '01 · The chassis',
    title: 'App design principles',
    body:
      'One chassis, five atoms, a handful of stacked views. The shape every Conduction app shares so users carry muscle memory across the suite.',
    href: '/docs/architecture/app-design-principles/',
    cta: 'Explore the chassis',
  },
  {
    eyebrow: '02 · The contract',
    title: 'App manifest',
    body:
      'A single JSON file declares pages, navigation, dependencies, and per-page slots. CnAppRoot reads it and mounts the right stacked view automatically.',
    href: '/docs/architecture/manifest/',
    cta: 'Read the manifest pattern',
  },
  {
    eyebrow: '03 · The data',
    title: 'Schemas and registers',
    body:
      'Schemas drive both the OpenRegister backend and the @conduction/nextcloud-vue frontend. One JSON Schema → typed records, columns, filters, forms, validation, and integrations.',
    href: '/docs/architecture/schemas-and-registers/',
    cta: 'See how schemas wire',
  },
  {
    eyebrow: '04 · The library',
    title: 'Components',
    body:
      '43 Cn* components — page shells, data display, dialogs, dashboard widgets, settings panels, design tokens. Every page has a live playground and an auto-generated reference.',
    href: '/docs/components/',
    cta: 'Browse components',
  },
]

/* Inline styles instead of CSS modules — keeps the homepage self-
   contained and avoids a per-page module file just for layout. All
   colour values come from brand tokens loaded by the preset's
   brand.css, so the homepage stays in lockstep with the rest of the
   site if a future preset bump retunes the palette. */

const heroSectionStyle = {
  background: 'var(--c-blue-cobalt, #003a8c)',
  color: 'white',
  padding: '6rem 1.5rem 5rem',
  borderBottom: '1px solid var(--c-cobalt-700, #002b6d)',
}

const heroInnerStyle = {
  maxWidth: '1280px',
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
}

const heroEyebrowStyle = {
  fontFamily: 'var(--conduction-typography-font-family-code, monospace)',
  fontSize: '0.75rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--c-cobalt-200, #cfdcef)',
  margin: 0,
}

const heroTitleStyle = {
  color: 'white',
  fontSize: 'clamp(2.25rem, 4vw, 3.25rem)',
  fontWeight: 700,
  lineHeight: 1.1,
  letterSpacing: '-0.02em',
  margin: 0,
  maxWidth: '24ch',
}

const heroLedeStyle = {
  color: 'var(--c-cobalt-100, #e1e9f5)',
  fontSize: '1.05rem',
  lineHeight: 1.55,
  maxWidth: '64ch',
  margin: 0,
}

const heroCtaRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  marginTop: '0.75rem',
}

const cardEyebrowStyle = {
  fontFamily: 'var(--conduction-typography-font-family-code, monospace)',
  fontSize: '0.75rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--c-cobalt-400, #6b7c93)',
  marginBottom: '0.75rem',
}

const cardTitleStyle = { marginTop: 0, marginBottom: '0.75rem' }

const cardBodyStyle = {
  color: 'var(--c-cobalt-700, #2c3e50)',
  fontSize: '0.95rem',
  lineHeight: 1.55,
  margin: 0,
}

const cardCtaStyle = {
  marginTop: '1.25rem',
  fontWeight: 600,
  color: 'var(--c-orange-knvb, #f57c00)',
  fontSize: '0.95rem',
}

function HomeCard({ card }) {
  // `href` (not `to`) so the preset's <Card/> renders as <a>. Card's
  // implementation only emits an anchor when `href` is set; passing
  // `to` falls through to a non-clickable <div>. Internal-route SPA
  // navigation isn't critical on the homepage — a regular full
  // navigation is fine and keeps the brand styling intact.
  return (
    <Card href={card.href} padding="lg">
      <div style={cardEyebrowStyle}>{card.eyebrow}</div>
      <h3 style={cardTitleStyle}>{card.title}</h3>
      <p style={cardBodyStyle}>{card.body}</p>
      <div style={cardCtaStyle}>{card.cta} →</div>
    </Card>
  )
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext()

  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <header style={heroSectionStyle}>
        <div style={heroInnerStyle}>
          <p style={heroEyebrowStyle}>
            Conduction · Vue 2 component library
          </p>
          <h1 style={heroTitleStyle}>
            Schema-driven Nextcloud apps,<br />
            one stacked view at a time.
          </h1>
          <p style={heroLedeStyle}>
            <strong>@conduction/nextcloud-vue</strong> is the higher-level
            component library every Conduction Nextcloud app builds on.
            One chassis, five atoms, a JSON manifest, and a schema —
            the rest renders itself.
          </p>
          <div style={heroCtaRowStyle}>
            <Button variant="primary" href="/docs/getting-started/">
              Get started
            </Button>
            <Button variant="secondary" href="/docs/components/">
              Browse components
            </Button>
            <Button
              variant="ghost"
              href="https://github.com/ConductionNL/nextcloud-vue"
            >
              View on GitHub
            </Button>
          </div>
        </div>
      </header>

      <Section>
        <SectionHead
          eyebrow="Four entry points"
          title="Pick where you want to start."
          lede={
            <>
              The library has four conceptual layers. Start at the chassis if
              you're new to the design system; jump straight to the components
              if you already know the pattern and just need the API.
            </>
          }
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            marginTop: '2.5rem',
          }}
        >
          {CARDS.map((card) => (
            <HomeCard key={card.title} card={card} />
          ))}
        </div>
      </Section>
    </Layout>
  )
}
