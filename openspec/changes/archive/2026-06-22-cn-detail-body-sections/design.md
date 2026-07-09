# Design: CnDetailPage In-Body Sections

## Resolver: reuse, don't reinvent

A body section's `component` is a registry NAME, resolved with the SAME
precedence `CnPageRenderer.resolveCustomComponent` uses:

1. v2 registry (`cnRegistry[name]`) — any entry exposing a `.component`.
2. legacy `cnCustomComponents[name]`.

`CnBodySections` injects both (`cnRegistry`, `cnCustomComponents`, both provided
by `CnAppRoot`) and does the lookup inline rather than depending on
`CnPageRenderer`, so it works wherever it is mounted (detail page today; a
dashboard / index page later).

## Decoupling from the integration parity contract

The integration registry (`OCA.OpenRegister.integrations`) requires every entry
to declare BOTH a `tab` and a `widget` (AD-11/AD-13, enforced by
`scripts/check-integration-parity.js`). Body sections deliberately DO NOT use
that registry — they use the v2 *component* registry, which has no such pairing
requirement. To make the intent explicit and keep `CnAppRoot._validateRegistry`
from rejecting a body-only registration, a new `section` kind is added with no
required metadata (like `page`). A `kind:'widget'` entry also resolves (it
already exposes `.component`), so a host may reuse an existing widget as a body
section without re-registering.

## Token resolution

`props` values are passed through the existing `resolveFilterValue` (from
`utils/resolveFilterTokens.js`) with `ctx = { objectId, object, workspace,
register, schema }`. After resolution, any value that is STILL an `@`-token
(unset optional `@workspace.<key>?`, or an `@object.<field>` whose field is
absent) is dropped from the props so the child receives `undefined` instead of a
literal token string — the same "unresolved → not-yet" semantics the list/stat
widgets already rely on.

## Provided context for inject-based components

Mirroring how `CnDashboardPage` provides `cnWorkspaceContext` and `CnDetailPage`
provides `cnObjectContext`, `CnBodySections` `provide`s a reactive
`cnSectionContext` ref holding `{ objectId, object, register, schema }`. A host
component can `inject('cnSectionContext')` and read the object without the
manifest spelling out `@object.*` props.

## Placement

`CnDetailPage` mounts ONE `CnBodySections` per placement (`before-body`,
`after-data`, `after-related`) filtered to that exact `placement`, plus one for
`end` that takes everything with no `placement` or `placement:"end"`. This keeps
the layout points fixed and readable in the template rather than computing a
single merged ordering. Within a placement, a 12-column responsive grid is used
when any section declares a `colSpan`; otherwise sections stack.

## Error isolation

Each section is wrapped in `CnSectionBoundary` — a tiny render-function component
with `errorCaptured` that flips to an inline error card when its child throws.
An unresolved component name (not in either registry) renders an inline
"not registered" message directly (no boundary needed). Either way the page and
sibling sections survive.

## Judgment calls

- **One mount per placement vs a single merged grid** → per-placement mounts.
  Recommended: keeps the four insertion points explicit in the detail template
  and avoids re-threading auto-body / related-collections ordering.
- **New `section` kind vs relaxing the parity check** → new `section` kind.
  Recommended: the parity check is for the *integration* registry, which body
  sections don't touch at all; adding a kind to the *component* registry's
  validator is the clean, isolated change.
- **`provide` context AND token props (both) vs one** → both. Recommended: token
  props cover declarative manifests; the provided context covers host components
  already written to inject (less manifest boilerplate).
