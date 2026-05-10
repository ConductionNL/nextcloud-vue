/**
 * Homepage for nextcloud-vue.conduction.nl.
 *
 * Layout pattern: brand <Hero/> + <Section/> with a four-card widget
 * grid linking into the four hub topics — same shape used on
 * conduction.nl, openregister.conduction.nl, and procest.conduction.nl.
 * Each card is a deeplink into a topic hub:
 *   1. App design principles  → /docs/architecture/app-design-principles
 *   2. App manifest           → /docs/architecture/manifest
 *   3. Schemas and registers  → /docs/architecture/schemas-and-registers
 *   4. Components             → /docs/components
 */

import React from 'react'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import {
  Hero,
  Section,
  SectionHead,
  Card,
} from '@conduction/docusaurus-preset/components'

const CARDS = [
  {
    eyebrow: '01 · The chassis',
    title: 'App design principles',
    body:
      'One chassis, five atoms, a handful of stacked views. The shape every Conduction app shares so users carry muscle memory across the suite.',
    to: '/docs/architecture/app-design-principles',
    cta: 'Explore the chassis',
  },
  {
    eyebrow: '02 · The contract',
    title: 'App manifest',
    body:
      'A single JSON file declares pages, navigation, dependencies, and per-page slots. CnAppRoot reads it and mounts the right stacked view automatically.',
    to: '/docs/architecture/manifest',
    cta: 'Read the manifest pattern',
  },
  {
    eyebrow: '03 · The data',
    title: 'Schemas and registers',
    body:
      'Schemas drive both the OpenRegister backend and the @conduction/nextcloud-vue frontend. One JSON Schema → typed records, columns, filters, forms, validation, and integrations.',
    to: '/docs/architecture/schemas-and-registers',
    cta: 'See how schemas wire',
  },
  {
    eyebrow: '04 · The library',
    title: 'Components',
    body:
      '43 Cn* components — page shells, data display, dialogs, dashboard widgets, settings panels, design tokens. Every page has a live playground and an auto-generated reference.',
    to: '/docs/components',
    cta: 'Browse components',
  },
]

function HomeCard({ card }) {
  return (
    <Card to={card.to} padding="lg">
      <div
        style={{
          fontFamily: 'var(--conduction-typography-font-family-code, monospace)',
          fontSize: '0.75rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--c-cobalt-400, #6b7c93)',
          marginBottom: '0.75rem',
        }}
      >
        {card.eyebrow}
      </div>
      <h3 style={{ marginTop: 0, marginBottom: '0.75rem' }}>{card.title}</h3>
      <p
        style={{
          color: 'var(--c-cobalt-700, #2c3e50)',
          fontSize: '0.95rem',
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {card.body}
      </p>
      <div
        style={{
          marginTop: '1.25rem',
          fontWeight: 600,
          color: 'var(--c-orange-knvb, #f57c00)',
          fontSize: '0.95rem',
        }}
      >
        {card.cta} →
      </div>
    </Card>
  )
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext()

  return (
    <Layout
      title={siteConfig.title}
      description={siteConfig.tagline}
    >
      <Hero
        eyebrow="Conduction · Vue 2 component library"
        title={<>Schema-driven Nextcloud apps,<br/>one stacked view at a time.</>}
        lede={
          <>
            <strong>@conduction/nextcloud-vue</strong> is the higher-level
            component library every Conduction Nextcloud app builds on.
            One chassis, five atoms, a JSON manifest, and a schema —
            the rest renders itself.
          </>
        }
        primaryCta={{ label: 'Get started', href: '/docs/getting-started' }}
        secondaryCta={{ label: 'Browse components', href: '/docs/components' }}
        tertiaryCta={{
          label: 'View on GitHub',
          href: 'https://github.com/ConductionNL/nextcloud-vue',
        }}
      />

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
