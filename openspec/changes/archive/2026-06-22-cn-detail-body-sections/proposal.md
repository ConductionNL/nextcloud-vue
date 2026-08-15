# CnDetailPage In-Body Sections (`bodyWidgets`)

## Why

`CnDetailPage` can already render a schema-driven auto-body (data widget +
related-objects), declarative `relatedCollections`, `summaryAggregates`,
`lifecycleActions`, and `relationLinks`. What it CANNOT do declaratively is host
an arbitrary, app-specific rich component **in the page body** — a BRP contact
panel, an activity timeline, a comms-history list, a relationship graph, a
bookings table. Those have only two existing escape hatches, both unsatisfactory
for the manifest-driven path:

1. The grid `type: 'integration'` widget — but the pluggable integration
   registry enforces a **parity contract**: every entry MUST declare BOTH a
   sidebar `tab` and a `widget`. A panel that only belongs in the body is forced
   to also invent a sidebar tab.
2. A hand-authored `#default` / `#before-body` slot — which means the page is no
   longer declarative (it needs a bespoke wrapper component per app).

This blocks pipelinq's ~40 bespoke detail pages (ClientDetail, ContactDetail, …)
from becoming `type:"detail"` manifest pages while keeping their rich sections in
the body. They need a declarative way to say "mount THIS registered component
here, scoped to this object."

## What Changes

- **NEW component `CnBodySections`** — a reusable in-body sections primitive.
  Given a list of section descriptors and a page/object `context`, it resolves
  each section's `component` from the v2 component registry (`cnRegistry`) or the
  legacy `cnCustomComponents` map (the SAME resolver `CnPageRenderer` uses),
  token-resolves the section's `props` (`@objectId` / `@object.<field>` /
  `@workspace.<key>` / time tokens), `provide`s the object context on
  `cnSectionContext` for inject-based components, lays sections out by
  `placement` + optional `colSpan`, and isolates each section behind an error
  boundary so one failing/unresolved section degrades inline instead of breaking
  the page. **No sidebar tab is required** — this is the explicit decoupling from
  the integration parity contract.

- **NEW `bodyWidgets` prop on `CnDetailPage`** (default `[]`, fully
  backwards-compatible). Mounts `CnBodySections` at four placement points in the
  body: `before-body`, `after-data`, `after-related`, and `end` (the default).
  Forwarded automatically by `CnPageRenderer` from `config.bodyWidgets`.

- **NEW recognised registry kind `section`** in `CnAppRoot`'s registry validator
  (alongside `page` / `widget` / `modal` / `tab` / …) — no required grid metadata
  and no sidebar-tab parity, so a host can register a body-only section cleanly.

## Impact

- **Affected components:** `CnDetailPage` (new prop), `CnAppRoot` (new kind),
  `CnPageRenderer` (no code change — `config.bodyWidgets` flows through the
  existing `config.*` → props forwarding). New `CnBodySections` +
  `CnSectionBoundary`.
- **Consumers:** opt-in. pipelinq adopts it first to convert ClientDetail /
  ContactDetail; the other four apps are unaffected until they declare
  `bodyWidgets`.
- **Backwards compatibility:** omitting `bodyWidgets` is exactly current
  behaviour. New prop has a `[]` default; the new registry kind is additive.
- **Theming:** `CnBodySections` uses only Nextcloud CSS variables; classes are
  `cn-` prefixed.
