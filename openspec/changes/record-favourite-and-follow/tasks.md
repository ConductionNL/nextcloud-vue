# Tasks: record-favourite-and-follow

> Star, Follow and the personal lenses over OpenRegister's interaction
> markers (ADR-032 `kind: code`). Backend: `favourites-and-recent`,
> `object-watchers`; optional `@self.can.manage` (design D3).

## Implementation tasks

### Task 1: Store plugin for the interaction calls
- **spec_ref**: `openspec/changes/record-favourite-and-follow/specs/record-favourite-follow/spec.md#requirement-a-record-carries-a-star-bound-to-its-favourite-marker`
- **files**: `src/store/plugins/interactions.js`, `src/store/plugins/index.js`, `tests/store/interactions.spec.js`
- **acceptance_criteria**:
  - `favourite`, `unfavourite`, `watch`, `unwatch`, `fetchWatchers`, `addWatcher`, `removeWatcher`
  - Each writes the server's answer into the stored object's `@self`
  - JSDoc on every action
- [ ] Implement
- [ ] Test

### Task 2: CnFavouriteToggle and CnFollowToggle
- **spec_ref**: `openspec/changes/record-favourite-and-follow/specs/record-favourite-follow/spec.md#requirement-a-manager-adds-and-removes-a-colleague`
- **files**: `src/components/CnFavouriteToggle/`, `src/components/CnFollowToggle/`, `src/components/index.js`, `tests/components/CnFavouriteToggle.spec.js`, `tests/components/CnFollowToggle.spec.js`
- **acceptance_criteria**:
  - Optimistic toggle, revert with the server's message, `not-found` on 404
  - Count only from `@self.watcherCount`; watchers fetched on popover open only
  - Picker (`NcSelect` with `inputLabel`) only with `@self.can.manage`; own-row remove otherwise
  - `notifies` prop (default `true`) and its tooltip; `cn-` classes, Nextcloud variables
- [ ] Implement
- [ ] Test

### Task 3: Place them on CnDetailPage and CnIndexPage
- **spec_ref**: `openspec/changes/record-favourite-and-follow/specs/record-favourite-follow/spec.md#requirement-index-pages-offer-a-star-column-and-personal-lenses`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/schemas/app-manifest-v2.schema.json`, `tests/components/CnDetailPageFavouriteFollow.spec.js`, `tests/components/CnIndexPagePersonalLenses.spec.js`, component reference docs
- **acceptance_criteria**:
  - Detail header renders both toggles beside the title when the markers are present; `favourite`/`follow` false removes them
  - `showFavouriteColumn` and `personalLenses` props with defaults; Recent disables sorting
  - Manifest schema accepts the four keys with their types
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
