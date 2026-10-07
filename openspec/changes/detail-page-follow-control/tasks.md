# Tasks: detail-page-follow-control

> Follow control on `type: detail` pages (ADR-032 `kind: code`). The backend
> is OpenRegister `2026-10-05-object-watchers`; nothing changes there except
> the optional `@self.can.manage` (design D3).

## Implementation tasks

### Task 1: Store helpers for the watcher calls
- **spec_ref**: `openspec/changes/detail-page-follow-control/specs/detail-page-follow/spec.md#requirement-a-detail-page-offers-follow-to-anyone-who-may-read-the-record`
- **files**: `src/store/plugins/watchers.js` (a store plugin with `watchObject`, `unwatchObject`, `fetchWatchers`, `addWatcher`, `removeWatcher`), `tests/store/watchers.spec.js`
- **acceptance_criteria**:
  - Each helper calls the route in the proposal table and returns the parsed answer
  - `watchObject` and `unwatchObject` write `@self.watching` on the store's copy of the object
  - JSDoc on every helper
- [ ] Implement
- [ ] Test

### Task 2: CnFollowButton with toggle, count and popover
- **spec_ref**: `openspec/changes/detail-page-follow-control/specs/detail-page-follow/spec.md#requirement-a-user-who-may-update-the-record-sees-who-follows-it`
- **files**: `src/components/CnFollowButton/CnFollowButton.vue`, `index.js`, `CnFollowButton.md`, `src/components/index.js`, `tests/components/CnFollowButton.spec.js`
- **acceptance_criteria**:
  - Props `object` (required), `register`, `schema`; all with defaults where optional
  - Optimistic toggle with rollback and the 404 message
  - Count and popover only when `@self.can.update === true`; no watchers call otherwise; a 403 hides the count silently
  - Picker (`NcSelect` with `inputLabel`) and per-row remove only when `@self.can.manage === true`; own-row remove otherwise
  - CSS classes prefixed `cn-`, Nextcloud CSS variables only
- [ ] Implement
- [ ] Test

### Task 3: Wire into CnDetailPage and the manifest schema
- **spec_ref**: `openspec/changes/detail-page-follow-control/specs/detail-page-follow/spec.md#requirement-the-follow-key-is-declared-in-the-manifest-schema`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/schemas/app-manifest-v2.schema.json`, `tests/components/CnDetailPage.follow.spec.js`, `docs/` component reference for CnDetailPage
- **acceptance_criteria**:
  - The detail read asks `_extend=@self.can` when the follow control is shown
  - `follow: false` renders nothing; `follow: true` without `@self.watching` warns once
  - Manifest validation accepts a boolean and refuses other types
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
