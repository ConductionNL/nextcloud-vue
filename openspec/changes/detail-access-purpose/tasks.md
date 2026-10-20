# Tasks: detail-access-purpose

### Task 1: A detail page can ask for a purpose before it opens
- **spec_ref**: `openspec/changes/detail-access-purpose/specs/detail-access-purpose/spec.md#requirement-a-detail-page-can-ask-for-a-purpose-before-it-opens`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/dialogs/CnAccessPurposeDialog.vue`, `src/schemas/app-manifest-v2.schema.json`, `l10n/en.json`, `l10n/nl.json`
- [x] Implement: the gate, the dialog, the session memory, the schema entry
- [x] Test: `tests/components/CnDetailPageAccessPurpose.spec.js`, `tests/components/CnAccessPurposeDialog.spec.js`
