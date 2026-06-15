# Manifest cardComponent on type:"index"

## Why

Softwarecatalog's `Organisaties` route — and an increasing share of routes
across the consumer fleet — needs a bespoke card layout in card-grid view
mode that the schema-driven `CnObjectCard` cannot produce: a profile-style
header with logo, contactpersoon block, software counts, and a call-to-action
button. Today the only escape hatch is `pages[].type: "custom"`, which
discards every benefit of the manifest convention (declarative routing,
consistent header, actions bar, mass actions, view-mode toggle, manifest-
driven sidebar, mass dialogs, …). The consumer reimplements the entire
index page just to swap the card body.

ADR-024's lib-side backlog has flagged this gap as part of the v2
maturation of `type:"index"`: the index renderer should be able to
delegate row rendering to a consumer-provided component the same way
`CnPageRenderer` already delegates `type:"custom"` page rendering and
the same way `CnObjectSidebar`/`CnSettingsPage` already resolve
component names against the consumer's `customComponents` registry
provided through `CnAppRoot`.

This change closes that gap with a single new field — `cardComponent` —
on the `type:"index"` `config` shape and a registry-resolved render path
in `CnIndexPage`'s card-grid branch. Consumers move from `type:"custom"`
back to `type:"index"` and keep their bespoke card UX.

## What Changes

- Schema: extend the `type:"index"` `config` description to document a
  new `cardComponent: string` field. The field references a key in the
  consuming app's `customComponents` registry (the same registry that
  already powers `type:"custom"` pages, `pages[].slots`, settings
  section components, and detail-sidebar custom widgets). Schema
  version bumps from `1.2.x` to `1.3.0`.
- `CnIndexPage`: accept a new `cardComponent` prop (string, default
  empty). When set AND `currentViewMode === 'cards'` AND no `#card`
  scoped slot is provided by the parent, the card-grid branch resolves
  the component name against the injected `cnCustomComponents` registry
  (or the explicit `customComponents` prop when set) and renders that
  component for each row in place of `CnObjectCard`. The resolved
  component receives `{ item, schema, register, selected }` props plus
  a `select` event listener — backwards-compatible with the existing
  `#card` slot scope (`object` aliases to `item` for symmetry; both are
  documented).
- `CnPageRenderer` already spreads `page.config` as props on the
  dispatched `index` page component, so the manifest path
  (`pages[].config.cardComponent`) flows into the prop with no
  renderer change.
- Unknown `cardComponent` names log a `console.warn` and fall back to
  `CnObjectCard` so a misconfigured manifest never blanks the grid.
- Tests: a new `CnIndexPageCardComponent.spec.js` plus extensions
  to the manifest schema fixtures.
- Docs: update `CnIndexPage.md` with the new prop + a worked example,
  and append a small section to `CnAppRoot.md` clarifying that the
  `customComponents` registry now also resolves index card components.

## Impact

- Affected specs: NEW capability `manifest-card-index-component`.
- Affected code:
  - `src/components/CnIndexPage/CnIndexPage.vue`
  - `src/components/CnIndexPage/CnIndexPage.md`
  - `src/components/CnAppRoot/CnAppRoot.md`
  - `src/schemas/app-manifest.schema.json`
  - `tests/components/CnIndexPageCardComponent.spec.js` (new)
- Backwards compatibility: full — `cardComponent` defaults to empty,
  in which case the existing `CnObjectCard` / `#card`-slot path runs
  unchanged. The `#card` scoped slot continues to take precedence over
  `cardComponent` when both are set so consumers migrating bit by bit
  can override individual pages without rewriting `cardComponent`.
- Schema version bumps to 1.3.0; v1.0/1.1/1.2 manifests remain valid
  because the new field is optional and the index `config` block keeps
  `additionalProperties: true`.

## See also

- `hydra/openspec/architecture/adr-024-app-manifest.md` — the
  ADR that defines `pages[].type` as a closed enum and the
  `customComponents` registry as the canonical extension surface.
- `manifest-page-type-extensions/` — predecessor change that extended
  the type enum but kept index card rendering schema-driven only.
- `manifest-config-defs/` — predecessor change that introduced the
  shared `column` $def with the per-cell `widget` field; this change
  adds the per-page `cardComponent` field at a different layer.
