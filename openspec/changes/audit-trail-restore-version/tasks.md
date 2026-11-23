# Tasks: audit-trail-restore-version

> Library half of buildiq `data-restore-record-version` (T03, D3,
> REQ-BQRR-003, REQ-BQRR-004); row `data-restore-record` (buildiq).
> `kind: code`.
> Checkbox budget: 4 tasks x 2 = 8 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: `useRestoreVersion`
- **spec_ref**: `openspec/changes/audit-trail-restore-version/specs/audit-trail-restore/spec.md#requirement-a-refusal-shows-a-fixed-sentence-and-changes-nothing`
- **files**: `src/composables/useRestoreVersion.js`, `src/composables/index.js`, `tests/composables/useRestoreVersion.spec.js`
- **acceptance_criteria**:
  - Posts `{ auditTrailId }` to the revert URL built with `generateUrl` and `buildHeaders()`
  - Maps 200, 403, 423, 404, other and network failure to the spec's sentences; never returns the body's `error`
  - Verify: jest with a stubbed `fetch`; mutation check: returning the server message reddens the 403 test
- [x] Implement
- [x] Test

### Task 2: The button and who sees it
- **spec_ref**: `openspec/changes/audit-trail-restore-version/specs/audit-trail-restore/spec.md#requirement-the-audit-trail-tab-offers-a-restore-only-when-asked`
- **files**: `src/components/CnObjectSidebar/CnAuditTrailTab.vue`, `tests/components/CnAuditTrailTabRestore.spec.js`
- **acceptance_criteria**:
  - Off by default; on, only `create` and `update` entries show the button
  - Hidden when `@self.actions` lacks `update`; shown when the key is missing; disabled with the holder when locked by someone else
  - Verify: jest
- [x] Implement
- [x] Test

### Task 3: Confirm, call and reload
- **spec_ref**: `openspec/changes/audit-trail-restore-version/specs/audit-trail-restore/spec.md#requirement-a-confirmed-restore-calls-the-revert-route-with-the-entry-id`
- **files**: `src/components/CnObjectSidebar/CnAuditTrailTab.vue`, `tests/components/CnAuditTrailTabRestoreFlow.spec.js`, `tests/a11y/CnAuditTrailTab.a11y.spec.js`
- **acceptance_criteria**:
  - The dialog shows the entry's date and user; confirm sends the entry id; success reloads page one, emits `restored` and `cn:page:refresh`
  - A 423 reloads the record and names the holder through `lockHolder()`
  - Verify: jest with a stubbed event bus; `npm run check:a11y`
- [x] Implement
- [x] Test

### Task 4: Docs and an end-to-end check
- **spec_ref**: `openspec/changes/audit-trail-restore-version/specs/audit-trail-restore/spec.md#requirement-a-confirmed-restore-calls-the-revert-route-with-the-entry-id`
- **files**: `docs/components/cn-object-sidebar.md`, `e2e/audit-trail-restore.e2e.js`
- **acceptance_criteria**:
  - Docs show `allowRestore` on a sidebar `audit` widget and the refusal sentences
  - A harness detail page restores a record to an earlier entry and shows the restored value and the new top entry
  - Verify: `npm run check:docs`, `npm run check:docs-fresh`, `npm run test:e2e -- audit-trail-restore`
- [x] Implement
- [ ] Test — not run: needs a live harness and `npm run test:e2e`
