# Tasks: cn-related-widget-tabbed

All work is in `@conduction/nextcloud-vue`. Spec ref:
`openspec/specs/manifest-detail-related-and-aggregates/spec.md` (REQ-MDRA-6, REQ-MDRA-7).
File: `src/components/CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue` unless noted.

## 1. Props & data source

- [x] 1.1 Add `register` (String, default `''`) and `schema` (String, default `''`) props; resolve effective `register`/`schema`/`id` from props with fallback to `objectData['@self']`.
- [x] 1.2 Add `layout` prop (String, default `'tabs'`; `'tabs'` | `'list'`) with a `validator`; default selects the new tabbed self-fetch path.
- [x] 1.3 Add a `relatedUrl(suffix)` helper that builds `/apps/openregister/api/objects/{register}/{schema}/{id}/{suffix}` via `@nextcloud/router`.

## 2. Self-fetch logic per endpoint

- [x] 2.1 Fetch the aggregated `/relations` call and map its grouped keys (notes, tasks, emails, events, contacts, deck) to tab groups with `{ results, total }`.
- [x] 2.2 Fetch `/uses` and `/used` and merge into an `Objects` group; optionally fetch `/contracts` when enabled.
- [x] 2.3 Fetch `/files` into a `Files` group; reuse `buildHeaders()` and shared error handling; set per-group loading/error state.
- [x] 2.4 Fetch sub-resources with `cache: 'no-store'` so a stale cached empty response is never shown on load.
- [x] 2.5 Resolve each item's display label from common title fields (`title` / `displayName` / `summary` / `subject` / `name`) so leaf records (e.g. contacts) show a human-readable label, not an internal id.

## 3. Tabbed UI

- [x] 3.1 Render a tab strip with one tab per non-empty group, each with a count badge equal to the group `total` (Nextcloud CSS variables only).
- [x] 3.2 Render the active tab's items inline below the strip; preserve the existing empty-state when no group has items.
- [x] 3.3 Show a loading placeholder during the initial fetch (gated by a `hasLoaded` flag); show the empty-state only after fetching completes.
- [x] 3.4 On item click, deep-link to the owning Nextcloud app: files → `/f/{fileid}`; records with `url`/`link`/`accessUrl` → that; known leaf types (contacts, deck) → their app route; objects → emit `select-object`; otherwise emit `select-related`. Do NOT render an open-in-sidebar affordance; keep `openInSidebarLabel` as a deprecated no-op prop.

## 4. Backward compatibility

- [x] 4.1 Keep all existing props/events/slots; when `layout="list"` (or store-fetch opted in) use the deprecated `store.fetchUses`/`fetchUsed`/`fetchContracts`/`fetchFiles` path and emit a one-time `console.warn` deprecation notice.

## 5. Docs & tests

- [x] 5.1 Update `docs/components/cn-related-objects-widget.md` (new props/events, tab model, self-fetch, deep-link navigation, deprecated open-in-sidebar note).
- [x] 5.2 Add/refresh JSDoc on every prop/event/slot; run `npm run check:docs` and `npm run check:jsdoc` (and regenerate the `_generated` partial) until both pass.
- [x] 5.3 Add tests in `tests/components/CnRelatedObjectsWidget.spec.js`: self-fetch + count badges, register/schema override, empty-state (no tab), file row deep-links to `/f/{id}`, unresolved leaf falls back to `select-related`, and legacy store-fallback + deprecation warning.

## Acceptance criteria

- GIVEN an object with `@self` register/schema/id and no plugin-enabled store, WHEN the widget mounts, THEN it fetches `/relations` + `/uses` + `/used` + `/files` and renders a tab per non-empty group with correct count badges.
- GIVEN `register`/`schema` props are set, WHEN the widget mounts, THEN endpoint URLs use the props, not `@self`.
- GIVEN every group returns `total: 0`, WHEN fetching completes, THEN no tab renders and the empty-state shows; while fetching is in flight a loading placeholder shows instead of the empty-state.
- GIVEN a Files tab item with fileid `4242`, WHEN it is clicked, THEN the widget opens `/f/4242`; a leaf item with no resolvable link emits `select-related` instead.
- GIVEN `layout="list"`, WHEN the widget mounts, THEN it uses the store-action fallback and logs a one-time deprecation warning.

## Quality checklist

- All existing props/events/slots preserved; new props have defaults.
- Nextcloud CSS variables only — no `--nldesign-*` references.
- `npm test`, `npm run check:docs`, `npm run check:jsdoc` all pass.
- `openspec validate cn-related-widget-tabbed --strict` passes.
- Code reviewed against REQ-MDRA-6 and REQ-MDRA-7.
