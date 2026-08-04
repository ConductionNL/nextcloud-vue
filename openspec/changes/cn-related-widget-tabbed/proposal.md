---
kind: code
---

## Why

`CnRelatedObjectsWidget` today renders a flat `<ul>` whose Objects and Files sections depend on optional store plugins (`relationsPlugin` / `filesPlugin`) that many consumer stores never register — so on a hand-rolled store like shillinq's `defineStore('object')` those sections render empty, leaving only a static "Linked apps" list. That list is derived from the client-side integration registry and only deep-links the sidebar; it never fetches the actual related items for those apps. Consumers see an almost-empty widget that knows nothing about the real related content. OpenRegister already exposes working endpoints (relations / uses / used / files / integrations) keyed by the object's `register`/`schema`/`id`, so the widget can fetch everything itself with no consumer-store changes.

## What Changes

- Redesign `CnRelatedObjectsWidget` from a flat list into a **tabbed, self-contained related-content browser**: a tab strip with one tab per non-empty group (Objects, Files, Mails, Meetings, Contacts, Tasks, Notes, Deck…), each tab fetched and rendered inline with a per-tab count badge.
- **Self-fetch from OpenRegister directly** using `register`/`schema`/`id` derived from `objectData['@self']`: one aggregated call to `/relations` for leaf groups plus `/uses`, `/used`, `/files` (and optionally `/contracts`). No consumer-app store changes required.
- Add new props `register` and `schema` (override of the `@self`-derived values) and a `layout` prop selecting tabbed vs. legacy list — all with defaults so existing usages keep working.
- **Clicking an item deep-links to its owning Nextcloud app** (files → `/f/{fileid}`; records with `url`/`accessUrl` → that; contacts/deck → their app route; objects → `select-object`; otherwise `select-related`). The dead "open in sidebar" affordance is removed (it only worked when the host mounted `CnObjectSidebar`); `openInSidebarLabel` is kept as a deprecated no-op.
- **Robust load UX**: a loading placeholder shows during the initial fetch (no empty-state flash), sub-resource requests bypass the HTTP cache (`no-store`) so stale empties aren't shown, and item labels resolve from common title fields (e.g. contacts show `displayName`, not an id).
- **Backward compatible**: keep ALL existing props/events/slots; tabs render only when they have content; the empty-state is preserved. Deprecate (don't remove) the old store-action path — fall back to `store.fetchUses` / `fetchUsed` / `fetchContracts` / `fetchFiles` when present, but DEFAULT to self-fetch.
- Update `docs/components/cn-related-objects-widget.md` and JSDoc so the CI `check:docs` / `check:jsdoc` gates pass.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `manifest-detail-related-and-aggregates`: `CnRelatedObjectsWidget` SHALL self-fetch related content from OpenRegister's per-object endpoints (derived from `@self` register/schema or props) and render it as a tabbed browser with per-tab count badges, a loading placeholder during fetch, cache-bypassed requests, and human-readable item labels; clicking an item deep-links to its owning Nextcloud app (files → `/f/{fileid}`, objects → host detail page, else `select-related`), while preserving the deprecated store-action path as a fallback.

## Impact

- **Code**: `src/components/CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue` (rewrite to tabbed + self-fetch), `docs/components/cn-related-objects-widget.md`, `tests/components/CnRelatedObjectsWidget.spec.js`, generated docs partial under `docs/components/_generated/`.
- **APIs consumed** (OpenRegister, all verified 200): `GET /apps/openregister/api/objects/{register}/{schema}/{id}/relations` (+ `?view=timeline`), `/uses`, `/used`, `/contracts`, `/files`, `/integrations/{integrationId}`.
- **Consumers**: all five apps that render the `related` built-in widget on a detail page (OpenRegister, OpenCatalogi, Procest, Pipelinq, MyDash) plus hand-rolled-store consumers like shillinq — the latter benefit most. No breaking changes; existing props/events/slots retained, new props defaulted.
- **Dependencies**: none added. No OpenRegister schema changes. Theming via Nextcloud CSS variables only.
