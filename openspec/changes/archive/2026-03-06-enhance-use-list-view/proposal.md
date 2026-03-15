# Proposal: enhance-use-list-view

## Summary

Every list page in pipelinq and procest contains ~60–80 lines of identical boilerplate for objectStore wiring, sidebar setup/teardown, schema loading, and fetch-param construction. The existing `useListView` composable in `@conduction/nextcloud-vue` handles only state (search, sort, filters) but leaves the integration layer to each page. This change enhances the composable to cover that integration layer so a complete list page requires ~40 LOC instead of ~150 LOC.

## Motivation

Six list views in pipelinq (ClientList, LeadList, ContactList) and procest (RequestList, CaseList, TaskList) each contain the same four blocks of code that never vary between entities:

1. **Sidebar wiring** — `setupSidebar()` / `teardownSidebar()` (~25 LOC, identical in every file)
2. **objectStore computed properties** — `objectStore`, `[entity]`, `loading`, `pagination` (~12 LOC, formulaic pattern)
3. **Fetch method** — builds `_search`, `_order`, filter params, calls `fetchCollection`, pushes `facetData` back to sidebar (~18 LOC)
4. **Lifecycle hooks** — `mounted()` calls `fetchSchema`, `setupSidebar`, fetch; `beforeDestroy()` calls `teardownSidebar` (~6 LOC)

This is ~500 LOC of pure duplication across the two apps today, and it will multiply with every new entity type added. It is also a source of drift bugs: when pipelinq's `fetchClients` was updated to handle multi-value filter params, the procest equivalent was not updated until a bug was found in production.

## Affected Projects

- [ ] Project: `nextcloud-vue` — enhance `useListView` composable; potentially rename to `useObjectList` for clarity
- [ ] Project: `pipelinq` — refactor 6+ list views to use the enhanced composable
- [ ] Project: `procest` — refactor 6+ list views to use the enhanced composable

## Scope

### In Scope

- Enhance `useListView` to accept `objectType` and optional `{ sidebarState, router, defaultPageSize }` options
- Return reactive `schema`, `objects`, `loading`, `pagination` wired directly to the objectStore
- Handle `fetchSchema` call on init
- Handle `setupSidebar` / `teardownSidebar` lifecycle automatically when `sidebarState` is provided
- Build fetch params (search, sort, filters, pagination) and call `fetchCollection` in one `refresh()` call
- Push `facetData` back to sidebar after each fetch
- Expose `onSearch`, `onSort`, `onFilterChange`, `onPageChange`, `onPageSizeChange` as ready-to-bind event handlers
- Update `useDetailView` to expose `isNew` computed and handle post-save router redirect when `router` option is provided
- Document both composables with usage examples in the nextcloud-vue docs

### Out of Scope

- Rewriting detail views (separate follow-up change)
- Adding composables for sub-resource management (already handled by `useSubResource`)
- Changes to the objectStore itself
- Procest and pipelinq production deployments (consumers update at their own pace)

## Approach

Extend `useListView(objectType, options)` so it wraps all the integration logic that every page currently implements manually. The composable receives `objectType` (e.g. `'client'`) and an optional options bag. It returns everything a `CnIndexPage`-based list view needs to bind directly to the template — no additional computed properties or methods required in the component.

Vue 2 option-components use the composable in `setup()` via `@vue/composition-api` (already a dependency of `@conduction/nextcloud-vue`). The composable uses `inject` internally to read `sidebarState` if present, keeping the page component's inject block optional.

## Cross-Project Dependencies

- `@conduction/nextcloud-vue` must be released (or aliased from source) before consumer apps can use the enhanced composable
- Both pipelinq and procest alias `@conduction/nextcloud-vue` to `../nextcloud-vue/src` in their webpack config, so they pick up changes immediately in development

## Rollback Strategy

- Composable is purely additive — existing `useListView` signature is preserved or extended backward-compatibly
- Consumer pages can be migrated one at a time; old and new patterns coexist during migration
- If the new composable introduces a regression, revert the consumer page to its previous implementation (git revert per file)

## Decisions Made

- **Export name**: Keep `useListView` — extend the existing export with new options. No rename, no deprecation.
- **useDetailView**: Include `useDetailView` enhancements in this same change.

## Open Questions

None — scope is confirmed.
