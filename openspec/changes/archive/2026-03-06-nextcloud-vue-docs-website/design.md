# Design: @conduction/nextcloud-vue Documentation Website

## Context

The `@conduction/nextcloud-vue` library is used by 6+ Nextcloud apps but has no public documentation. Developers rely on reading source code and copying patterns from existing apps. Pipelinq already has a working Docusaurus setup we can replicate. The library source lives in `nextcloud-vue/` within the apps-extra workspace.

**Stakeholders**: App developers building on the library, new team members onboarding, external contributors.

**Current state**: Zero documentation. Component API, architecture, and integration patterns are only discoverable by reading source code across multiple repositories.

## Goals / Non-Goals

### Goals
- Replicate the Pipelinq Docusaurus setup for `nextcloud-vue`
- Document all 28 exported components, 5 store exports, 3 composables, and 8 utility functions
- Explain the three-layer architecture (Nextcloud Vue → @conduction/nextcloud-vue → App)
- Provide integration guides for OpenRegister and NL Design System
- Auto-deploy to GitHub Pages on push to `development`

### Non-Goals
- Live component playground / Storybook (future work)
- Auto-generated API docs from JSDoc (manual markdown is sufficient for now)
- Versioned documentation (single version for current API)
- Custom domain setup (use default GitHub Pages URL initially)

## Decisions

### 1. Docusaurus 3.7.0 (same as Pipelinq)

**Choice**: Docusaurus 3.7.0 with classic preset and Mermaid theme.

**Why**: Pipelinq already proves this works. Same tooling means shared knowledge, consistent CI workflow, and identical developer experience.

**Alternatives considered**:
- VitePress — lighter but different from existing setup, would require new CI workflow
- Storybook — better for component playground but heavier setup, not suited for architectural documentation
- Plain GitHub wiki — no build step but poor structure and no custom styling

### 2. Directory structure: `docusaurus/` + `docs/`

**Choice**: Config in `nextcloud-vue/docusaurus/`, content in `nextcloud-vue/docs/`.

**Why**: Matches Pipelinq exactly. Separates build tooling from content. Docusaurus references docs via `path: '../docs'`.

### 3. Manual markdown (not auto-generated from source)

**Choice**: Hand-written markdown documentation pages.

**Why**: The library is small enough (28 components, ~50 exports total) that manual docs are manageable. Auto-generation from JSDoc would require adding JSDoc to all components first — a separate effort. Manual docs allow richer explanations of patterns and relationships.

**Trade-off**: Docs can drift from source. Mitigated by the specs requirement that props tables match actual source.

### 4. Content structure

```
docs/
├── getting-started.md              (sidebar_position: 1)
├── architecture/
│   ├── overview.md                 (layer diagram, component mapping)
│   ├── schema-driven.md            (schema → columns → table flow)
│   └── store.md                    (createObjectStore, plugins)
├── components/
│   ├── index.md                    (categorized component list)
│   ├── cn-index-page.md
│   ├── cn-index-sidebar.md
│   ├── cn-data-table.md
│   ├── cn-filter-bar.md
│   ├── cn-facet-sidebar.md
│   ├── cn-icon.md
│   ├── cn-pagination.md
│   ├── cn-row-actions.md
│   ├── cn-mass-action-bar.md
│   ├── cn-object-card.md
│   ├── cn-card-grid.md
│   ├── cn-status-badge.md
│   ├── cn-kpi-grid.md
│   ├── cn-stats-block.md
│   ├── cn-cell-renderer.md
│   ├── cn-delete-dialog.md
│   ├── cn-copy-dialog.md
│   ├── cn-form-dialog.md
│   ├── cn-mass-delete-dialog.md
│   ├── cn-mass-copy-dialog.md
│   ├── cn-mass-export-dialog.md
│   ├── cn-mass-import-dialog.md
│   ├── cn-settings-card.md
│   ├── cn-settings-section.md
│   ├── cn-configuration-card.md
│   ├── cn-version-info-card.md
│   └── cn-register-mapping.md
├── store/
│   ├── object-store.md             (createObjectStore, useObjectStore)
│   └── plugins.md                  (all 5 plugins + createSubResourcePlugin)
├── composables/
│   └── index.md                    (useListView, useDetailView, useSubResource)
├── utilities/
│   └── index.md                    (buildHeaders, columnsFromSchema, etc.)
└── integrations/
    ├── openregister.md
    ├── nldesign.md
    └── ecosystem.md
```

### 5. Open Webconcept green theme

**Choice**: Reuse Pipelinq's custom.css (primary `#2fb298`, Poppins font, dark mode).

**Why**: Consistent branding across Conduction documentation sites.

### 6. GitHub Pages deployment (no custom domain initially)

**Choice**: Deploy to `https://conductionnl.github.io/nextcloud-vue/` via GitHub Pages.

**Why**: Simplest setup. Custom domain can be added later by updating `baseUrl` and adding a CNAME file.

## Risks / Trade-offs

- **Documentation drift** → Mitigated by keeping docs in the same repo as source. PRs that change component APIs should update docs.
- **Large initial content effort** → 28 component pages + 5 architecture pages is significant. Mitigated by starting with the most-used components and expanding iteratively.
- **No live examples** → Readers can't try components interactively. Mitigated by linking to real app repositories where components are used.

## Migration Plan

1. Create `docusaurus/` directory with config, homepage, theme (copy from Pipelinq, adapt)
2. Create `docs/` directory with content pages
3. Add `.github/workflows/documentation.yml` for deployment
4. Push to `development` branch to trigger first deployment
5. Add link to docs site in README

**Rollback**: Delete `docusaurus/` and `docs/` directories. No library code is affected.

## Open Questions

_(none — approach is well-established from Pipelinq)_
