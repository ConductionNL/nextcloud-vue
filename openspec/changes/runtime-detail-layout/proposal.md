---
kind: code
depends_on: []
---

# Proposal: runtime-detail-layout

Sibling half of buildiq `case-page-layout-per-case-type` task 3.2 (and
buildiq `competitor-parity-2026-09` task 2.3). Owner nextcloud-vue, because
`CnDetailPage` is where a detail page is drawn.

## Why

Buildiq lets an administrator lay out a case page per case type and serves
that layout as the `buildiq-page-layout` leaf (ADR-066). A consuming app
(dossiq, portaliq) places the leaf in its manifest, but nothing in
`CnDetailPage` asks the leaf, so every case of every type still renders the
one manifest layout. Each app would otherwise write the same ask-and-merge
code around the page.

## What changes

- `CnDetailPage` takes an optional `layoutLeaf` (manifest
  `config.layoutLeaf`): a leaf id.
- Once the object resolves, the page asks
  `GET {apiBase}/objects/{register}/{schema}/{id}/integrations/{layoutLeaf}`,
  the read `CnIntegrationCard` already uses, and takes at most `items[0]`.
- The answer replaces, part by part, what the manifest config set:
  `header.fields` → `headerFields`, `tabs` → the order and labels of
  `sidebarTabs`, `widgets` → the body widgets. A part the answer does not
  carry keeps the manifest's. `taskList` and `uploadFields` are handed on,
  unrendered, through a `layout-resolved` event and the injected page state.
- No answer, an empty `items`, or a failing read renders the manifest config
  unchanged and shows nothing: the leaf is optional by design.

## Out of scope

- Authoring layouts (buildiq's page designer).
- Who may see which layout: the provider resolves the audience from the
  caller's session; the page sends none.
