# Tasks: record-unread-markers

> Unread markers, read-state and tab badges over OpenRegister
> `object-read-state` (ADR-032 `kind: code`).

## Implementation tasks

### Task 1: CnUnreadMarker and the list
- **spec_ref**: `openspec/changes/record-unread-markers/specs/record-unread/spec.md#requirement-lists-mark-unread-records-and-filter-on-them`
- **files**: `src/components/CnUnreadMarker/`, `src/components/index.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `tests/components/CnUnreadMarker.spec.js`, `tests/components/CnIndexPageUnread.spec.js`
- **acceptance_criteria**:
  - Dot `aria-hidden`, visually hidden "Unread" before the title, bold row title
  - `personalLenses` accepts `unread` and adds `{_unread: true}`
  - `cn-` classes, Nextcloud variables
- [ ] Implement
- [ ] Test

### Task 2: Read-state on CnDetailPage
- **spec_ref**: `openspec/changes/record-unread-markers/specs/record-unread/spec.md#requirement-opening-a-record-marks-it-read`
- **files**: `src/store/plugins/interactions.js`, `src/components/CnDetailPage/CnDetailPage.vue`, `src/schemas/app-manifest-v2.schema.json`, `tests/components/CnDetailPageReadState.spec.js`
- **acceptance_criteria**:
  - One `PUT` after render; none on a failed load; none with `markRead: false`
  - Mark as unread entry sends `DELETE` and emits `marked-unread`
  - Manifest schema accepts `markRead` (boolean)
- [ ] Implement
- [ ] Test

### Task 3: Tab badges from unreadCounts
- **spec_ref**: `openspec/changes/record-unread-markers/specs/record-unread/spec.md#requirement-tabs-show-what-is-new-on-them`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/schemas/app-manifest-v2.schema.json`, `tests/components/CnDetailPageUnreadBadges.spec.js`, CnDetailPage reference docs
- **acceptance_criteria**:
  - `unreadKey` on tabs, default the tab id
  - Own `count` wins; absent or 0 shows nothing
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
