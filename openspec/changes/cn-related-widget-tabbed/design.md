# Design: cn-related-widget-tabbed

## Architecture Overview

`CnRelatedObjectsWidget` is rewritten from a flat `<ul>` of three store-driven
sections into a **tabbed, self-contained related-content browser** that fetches
its own data from OpenRegister. It stays on the `CnWidgetWrapper` chrome (Widget
family) and remains the `related` built-in widget rendered beneath
`CnObjectDataWidget` on the default detail-page auto-body. The redesign lives
ENTIRELY in `@conduction/nextcloud-vue`; no consumer-app store changes are
required.

Tab model (one tab per non-empty group, count badge per tab):

```
[ Objects 4 ] [ Files 12 ] [ Mails 3 ] [ Meetings 1 ] [ Contacts 2 ] [ Tasks 5 ] [ Notes 8 ] [ Deck 2 ]
└──────────────── active tab renders its items inline below the strip ────────────┘
   (clicking an item deep-links to its owning app: file → /f/{id}, …)
```

### Declarative-vs-imperative decision

N/A. This is a frontend component redesign with NO OpenRegister schema changes
and NO lifecycle / aggregation / calculation / notification schema behaviour.
There is no declarative-vs-imperative axis to decide here — the widget simply
calls existing OpenRegister read endpoints from the browser.

## API Design

The widget consumes existing OpenRegister endpoints (all verified 200). URLs are
built from `register` / `schema` / `id` derived from `objectData['@self']`
(overridable via the `register` / `schema` / `objectId` props). Base path:
`/apps/openregister/api/objects/{register}/{schema}/{id}`.

### `GET /apps/openregister/api/objects/{register}/{schema}/{id}/relations`
Aggregated leaf content, grouped. `?view=timeline` flattens chronologically.
**Response:**
```json
{
  "notes": { "results": [], "total": 0 },
  "tasks": { "results": [], "total": 0 },
  "emails": { "results": [], "total": 0 },
  "events": { "results": [], "total": 0 },
  "contacts": { "results": [], "total": 0 },
  "deck": { "results": [], "total": 0 }
}
```

### `GET .../uses` and `GET .../used`
Object-to-object relations.
**Response:**
```json
{ "results": [], "total": 0, "limit": 20, "offset": 0 }
```

### `GET .../files`
**Response:**
```json
{ "results": [], "total": 0, "page": 1, "pages": 1, "limit": 20, "offset": 0 }
```

### `GET .../contracts` (optional)
**Response:**
```json
{ "results": [], "total": 0 }
```

### `GET .../integrations/{integrationId}` (per-app linked items, optional)
**Response:**
```json
{ "items": [], "total": 0, "nextCursor": null }
```

## Database Changes

None. No OpenRegister schema changes; no migrations; no seed data.

## Nextcloud Integration

Pure frontend (Vue 2.7 Options API). No PHP controllers / services / mappers /
entities / events. The widget uses `@nextcloud/router` `generateUrl` (already a
dependency) to build the endpoint paths and the standard fetch/axios path used
elsewhere in the library.

- Component: `src/components/CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue`
- Reuses: `CnWidgetWrapper` chrome, `useIntegrationRegistry` (for icon/label of
  each group's integration and the open-in-sidebar id mapping).

## File Structure

```
src/components/CnRelatedObjectsWidget/
  CnRelatedObjectsWidget.vue   # rewrite: tabbed UI + self-fetch + fallback
docs/components/
  cn-related-objects-widget.md # updated props/events/slots + tab behaviour
docs/components/_generated/
  CnRelatedObjectsWidget.md    # regenerated partial (prebuild:docs)
tests/components/
  CnRelatedObjectsWidget.spec.js  # tabs, badges, self-fetch, fallback, empty
```

## Security Considerations

No new auth surface. The widget calls authenticated, same-origin OpenRegister
endpoints the user can already reach for the loaded object; the object's own
`@self` register/schema/id scope every request, so no cross-object access is
introduced. Standard NC request headers (`buildHeaders()` / CSRF) are reused. No
secrets handled. Examples use the nil UUID
`00000000-0000-0000-0000-000000000000`.

## NL Design System

Tab strip and badges use Nextcloud CSS variables only
(`var(--color-primary-element)`, `var(--color-border)`, `var(--color-background-hover)`,
`var(--color-text-maxcontrast)`) — never `--nldesign-*` — so nldesign theming
applies automatically. Prefer NC components where a tab/badge primitive exists;
otherwise `cn-`-prefixed classes. Count badges follow the existing
`CnStatusBadge` colour conventions.

## Decisions

- **Self-fetch by default, store-fallback deprecated** — the root cause of the
  empty widget is consumer stores lacking `relationsPlugin` / `filesPlugin`.
  Deriving register/schema/id from `@self` makes the widget work everywhere with
  zero consumer changes. The old `store.fetch*` path is kept for one cycle
  behind a `console.warn` so nothing breaks immediately. *Alternative
  considered:* requiring all consumers to register the plugins — rejected, it
  pushes work onto every consumer and doesn't help hand-rolled stores.
- **Tabbed over flat list** — a tab strip with count badges scales to 8+ groups
  without a long scroll and makes empty groups invisible (no tab) rather than
  empty headings. *Alternative:* collapsible accordion sections — rejected as
  noisier when most groups are non-empty.
- **One aggregated `/relations` call + 3 dedicated calls** — `/relations`
  already groups the leaf content in a single round-trip; `/uses`, `/used`,
  `/files` are separate endpoints so they stay separate calls. *Alternative:*
  one call per leaf group — rejected as wasteful when `/relations` aggregates.
- **Item clicks deep-link to the owning Nextcloud app** — superseded the earlier
  "open in sidebar" affordance, which only worked when the host mounted
  `CnObjectSidebar` and silently did nothing otherwise (observed live on
  shillinq). Files open `/f/{fileid}`, records with `url`/`accessUrl` open that,
  contacts/deck build their app route, objects emit `select-object`, and an
  unresolvable item emits `select-related`. `open-integration` is still emitted
  by the legacy list-mode "Linked apps" rows; `openInSidebarLabel` is a
  deprecated no-op.
- **Robust load UX** — a `hasLoaded`-gated loading placeholder replaces the
  empty-state during the initial fetch (no "nothing related" flash); sub-resource
  requests use `cache: 'no-store'` so a stale empty response is never shown; item
  labels resolve from common title fields so leaf records (contacts) render a
  name, not an internal id.

### New props / events (backward-compatible)

- `register` (String, default `''`) — overrides the `@self`-derived register.
- `schema` (String, default `''`) — overrides the `@self`-derived schema.
- `layout` (String, default `'tabs'`) — `'tabs'` (new default) or `'list'`
  (legacy flat list + store-action path).
- Existing props (`title`, `objectType`, `objectId`, `objectData`, `store`,
  `showObjects`, `showFiles`, `showIntegrations`, `excludeIntegrations`,
  `extraSections`, …) and the `open-integration` event are all preserved.

## Trade-offs

- [Self-fetch couples the widget to OpenRegister's URL shape] → Mitigation:
  paths are centralised behind a single `relatedUrl()` helper in the SFC; URL
  shape already stable and verified 200.
- [Two render paths (tabs + legacy list) increase surface area] → Mitigation:
  legacy path is deprecation-only and exercised by a dedicated fallback test;
  removable next major.
- [`/relations` group keys may evolve] → Mitigation: the widget maps known keys
  to tabs and ignores unknown keys gracefully; a missing group simply yields no
  tab.

## Migration Plan

Additive and backward-compatible: bump the library version, publish; consumers
get the tabbed widget on upgrade with no code changes. Rollback = revert the SFC
commit (no schema/state to undo). The legacy `layout="list"` path remains for
one cycle for any consumer that needs the old behaviour.

## Open Questions

- Whether to also surface `?view=timeline` as a built-in "All / Timeline" tab in
  this change or defer to a follow-up. Provisional: defer; this change ships the
  per-group tabs only.
