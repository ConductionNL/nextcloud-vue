# Tasks: saved-view-summary-reads-like-the-chips

### Task 1: The view summary names filters as the Active line and leaves hidden ones out
- **spec_ref**: `openspec/changes/saved-view-summary-reads-like-the-chips/specs/saved-view-menu-settings/spec.md#requirement-a-view-summary-reads-like-the-active-line`
- **files**: `src/utils/savedViewSummary.js`, `src/components/CnSavedViewMenuSettings/CnSavedViewMenuSettings.vue`, `src/components/CnIndexPage/CnIndexPage.vue`
- [x] Implement: `filterLabels` labels, values and `hidden`; a failed schema read is not cached
- [x] Test: `tests/utils/savedViewSummary.spec.js`, `tests/components/CnSavedViewMenuSettings.spec.js`, `tests/components/SavedViewFilterSummary.spec.js`
