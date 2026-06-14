# Manifest dynamic per-tenant menu entries

## Why

`@conduction/nextcloud-vue` ships a static `manifest.json` that
declares every `menu[]` entry at build time. That model fits apps
whose top-level navigation is fixed (decidesk, larpingapp,
softwarecatalog), but it cannot model **per-tenant menu fan-out** —
where one declared menu entry expands into N children that depend on
runtime data (catalogues, organisations, registers).

Opencatalogi is the first real consumer with this need. Its previous
`MainMenu.vue` rendered one nav entry per catalogue with
`v-for="catalogus in catalogs"`. The bundled manifest cannot model
this — the loader sees a single static `menu[]` array and
`CnAppNav` renders exactly what it sees.

ADR-024 lib v2 backlog already calls this out:

| Lib v2 backlog row | Status |
|---|---|
| Dynamic per-tenant menu entries | unresolved |
| Backend `/api/manifest` endpoint implementation | opt-in stub today |

The two are the same problem viewed from two angles. This change
collapses them: **canonicalise the existing
backend-merge path as the dynamic-menu mechanism, and document the
contract for the backend side**. No new schema fields, no new
runtime fetcher in the lib.

## What Changes

Adopt the **backend-populated menu** pattern:

- The backend `GET /index.php/apps/{appId}/api/manifest` endpoint
  MAY return a partial manifest whose `menu[]` array is the
  per-tenant resolved list. The deep-merge in `useAppManifest`
  already replaces `menu[]` wholesale (arrays are replaced, not
  concatenated — see the loader's deep-merge semantics), so a
  backend that wants to add catalogue children populates the full
  resolved `menu[]` and returns it.
- The schema is unchanged: backend-supplied `menu[]` entries
  conform to the same `menuItem` / `menuItemLeaf` `$defs` the
  bundled manifest uses, and validation runs against the merged
  result.
- Document the pattern under the `useAppManifest` reference docs
  and add a "Dynamic per-tenant menu entries" section to
  `migrating-to-manifest.md` so consumer apps know the path.
- Add a fixture-level test to `useAppManifest.spec.js` that
  asserts the backend can supply a menu with one bundled entry
  expanded into N children — locking the contract under tests so
  future loader refactors do not break it.

Specifically out of scope:

- **Option B** (a `dynamicSource: { register, schema, labelField,
  routeTemplate }` field on `menu[]` entries with lib-side runtime
  fetching) is **rejected**. See `design.md` for the trade-off
  analysis.
- The backend `/api/manifest` controller implementation —
  per-app concern, lives in each consumer app's adoption change
  (`opencatalogi-adopt-manifest`, etc.). This change documents the
  contract; per-app changes ship the implementation.

## Problem

Without a documented dynamic-menu story, three failure modes are
already in flight:

1. **Opencatalogi adoption stalls** — PR #547 cannot proceed until
   the team knows how to fan out catalogues into `MainMenu.vue`'s
   former structure. Everyone defaults to "we'll add a custom hook
   on top of useAppManifest" — which is the local-resolver
   anti-pattern that `manifest-resolve-sentinel` already rejected.
2. **Each app reinvents the loader** — without a documented path,
   the next four apps (mydash, organisations-flavoured procest,
   etc.) each draft their own runtime fan-out hook. Three such
   forks already exist as PR drafts.
3. **Schema drifts toward Option B** — three Slack threads have
   independently sketched a `dynamicSource` field; if one lands, the
   schema gains a `register`/`schema` key that bleeds the data
   layer into the manifest contract. ADR-022 forbids this.

## Proposed Solution

Pick **Option A**: the backend returns a fully-populated
`menu[]` and `useAppManifest`'s existing deep-merge absorbs it.
Lib change is documentation + a fixture test.

The implementation surface is small: ~0 lines of runtime code in
the lib, ~30 lines of test fixture, two docs pages. The backend
contract has always supported this; the spec just makes it
explicit.

Per-app backends adopt at their own pace:

- An app that wants dynamic menu entries implements
  `GET /api/manifest` returning `{ menu: [resolved], pages: [] }`.
- An app that does not yet need dynamic menus returns 404, and the
  loader silently falls back to the bundled manifest (existing
  behaviour, REQ-JMR-002 silent-fallback path).
- The bundled manifest SHOULD include a placeholder menu entry
  (e.g. `{ id: "catalogs", label: "menu.catalogs" }`) so the
  manifest validates and the menu does not blank when the backend
  is unavailable.

This pairs cleanly with the i18n source-of-truth ADR-025 (`label`
remains a translation key — backend supplies a key, never a
formatted string) and ADR-022 (the lib never directly queries a
register; the backend owns that).
