# Tasks: detail-band

### Task 1: A detail page can draw a band across the page above the body and the side column
- **spec_ref**: `openspec/changes/detail-band/specs/detail-page/spec.md#requirement-a-detail-page-can-draw-a-band-across-the-page-above-the-body-and-the-side-column`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/css/detail-page.css`, `src/schemas/app-manifest-v2.schema.json`, `src/utils/validateManifestV2.compiled.js`
- [x] Implement: `band` prop, `bandWidgets`, the band row before the body; the schema entry
- [x] Test: `tests/components/CnDetailPageBand.spec.js`, `tests/schemas/app-manifest-v2.schema.spec.js`

### Task 2: A detail header link builds its URL from the record
- **spec_ref**: `openspec/changes/detail-band/specs/detail-page/spec.md#requirement-a-detail-header-link-builds-its-url-from-the-record`
- **files**: `src/utils/actionLink.js`, `src/components/CnDetailPage/CnDetailPage.vue`
- [x] Implement: `headerActionAsLink(entry, tokenCtx)`; the detail page passes its record
- [x] Test: `tests/components/CnDetailPageBand.spec.js`

### Task 3: A detail page's own primary action is a link
- **spec_ref**: `openspec/changes/detail-band/specs/detail-page/spec.md#requirement-a-detail-pages-own-primary-action-is-a-link`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: `primaryActionLink`, `query` on `$defs.primaryAction`
- [x] Test: `tests/components/CnDetailPageBand.spec.js`, `tests/schemas/app-manifest-v2.schema.spec.js`
