# Proposal: @conduction/nextcloud-vue Documentation Website

## Why

The `@conduction/nextcloud-vue` library powers 6+ Nextcloud apps (OpenRegister, OpenCatalogi, Pipelinq, Procest, LarpingApp, MyDash) but has **zero public documentation**. Developers building new apps or onboarding onto existing ones have no way to discover available components, understand the design philosophy, or learn how the library fits between Nextcloud's own component system and OpenRegister's schema-driven architecture.

Nextcloud documents its layout primitives at [Layout Components](https://docs.nextcloud.com/server/stable/developer_manual/design/layoutcomponents.html) and its Vue component API at [Nextcloud Vue Components](https://nextcloud-vue-components.netlify.app/). Our library builds **on top** of these — composing Nextcloud primitives into higher-level, schema-driven page patterns — but this relationship is undocumented and invisible to anyone outside the core team.

## What Changes

- **New**: Docusaurus 3.7.0 documentation website for `@conduction/nextcloud-vue` (same setup as Pipelinq)
- **New**: `nextcloud-vue/docs/` directory with markdown content covering components, architecture, and integration guides
- **New**: `nextcloud-vue/docusaurus/` directory with Docusaurus config, custom homepage, and theme
- **New**: GitHub Actions workflow for GitHub Pages deployment
- **New**: Component reference pages explaining each Cn* component's purpose, props, and usage
- **New**: Architecture guide explaining the layered relationship: Nextcloud Vue → @conduction/nextcloud-vue → App
- **New**: Integration guides for OpenRegister and NL Design System

## Capabilities

### New Capabilities

- **docs-site-infrastructure** — Docusaurus project setup, config, build pipeline, GitHub Pages deployment, custom domain
- **component-reference** — Per-component documentation pages with props, events, slots, and usage examples for all Cn* components
- **architecture-guide** — Design philosophy documentation: how the library layers on Nextcloud Vue primitives (NcAppNavigation → MainMenu, NcAppContent → CnIndexPage, NcAppSidebar → CnIndexSidebar), the schema-driven pattern, and the createObjectStore/plugin system
- **integration-guides** — How the library connects to OpenRegister (schema API, object CRUD, faceting) and NL Design System (CSS variables, design tokens, nldesign app compatibility)
- **getting-started-guide** — Quick start for building a new Nextcloud app using the library: scaffold, configure, register types, build

### Modified Capabilities

_(none — this is a new documentation-only addition)_

## Impact

- **New files**: `nextcloud-vue/docusaurus/` (config, homepage, theme), `nextcloud-vue/docs/` (10-15 markdown files)
- **New dependency**: Docusaurus 3.7.0 (isolated in `docusaurus/package.json`, does not affect library build)
- **New CI workflow**: `.github/workflows/documentation.yml` for GitHub Pages
- **No code changes**: Library source (`src/`) is unaffected — this is documentation only
- **Affected repos**: `nextcloud-vue` only (new files added)
