# Tasks: detail-title-field

### Task 1: titleField on a detail page
- **spec_ref**: `openspec/changes/detail-title-field/specs/detail-page/spec.md#requirement-a-detail-page-can-name-the-record-by-a-field`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: prop `titleField`, read in `objectDisplayName`; the schema's `config.titleField` covers type='detail'
- [x] Test: `tests/components/CnDetailPageTitleField.spec.js`, `tests/schemas/app-manifest-v2.schema.spec.js`
