# Tasks: files-preview-in-place

> Row `pub-preview` (opencatalogi). `kind: code`.
> Checkbox budget: 4 tasks x 2 = 8 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: `useFileOpener`
- **spec_ref**: `openspec/changes/files-preview-in-place/specs/files-preview/spec.md#requirement-every-files-component-opens-a-file-the-same-way`
- **files**: `src/composables/useFileOpener.js`, `src/components/CnObjectSidebar/CnFilesTab.vue`, `tests/composables/useFileOpener.spec.js`
- **acceptance_criteria**:
  - The four steps run in order; `CnFilesTab` behaves as before for types the Viewer handles
  - A `javascript:` access URL never opens (safeHref)
  - Verify: jest with a stubbed `window.OCA.Viewer`; mutation check: swapping steps 1 and 2 reddens the Viewer-first test
- [ ] Implement
- [ ] Test

### Task 2: `CnFilePreview`
- **spec_ref**: `openspec/changes/files-preview-in-place/specs/files-preview/spec.md#requirement-a-data-file-is-previewed-in-the-page`
- **files**: `src/components/CnFilePreview/`, `src/components/index.js`, `src/index.js`, `tests/components/CnFilePreview.spec.js`, `tests/a11y/CnFilePreview.a11y.spec.js`
- **acceptance_criteria**:
  - CSV, TSV, JSON, XML and text render as specified from fixtures; the request carries `Range: bytes=0-1048575`
  - A cell holding `<img onerror>` renders as text
  - Verify: jest; `npm run check:a11y`; `npm run check:smoke`
- [ ] Implement
- [ ] Test

### Task 3: Card, widget and related files use the opener
- **spec_ref**: `openspec/changes/files-preview-in-place/specs/files-preview/spec.md#requirement-every-files-component-opens-a-file-the-same-way`
- **files**: `src/components/CnFilesCard/CnFilesCard.vue`, `src/components/CnFilesWidget/CnFilesWidget.vue`, `src/components/CnRelatedFiles/CnRelatedFiles.vue`, `tests/components/CnFilesCardOpen.spec.js`
- **acceptance_criteria**:
  - Each calls the opener; `CnFilesCard` rows are buttons with the file name as label
  - Verify: jest
- [ ] Implement
- [ ] Test

### Task 4: Public runtime and docs
- **spec_ref**: `openspec/changes/files-preview-in-place/specs/files-preview/spec.md#requirement-public-pages-preview-without-the-viewer`
- **files**: `src/composables/useFileOpener.js`, `e2e/file-preview.e2e.js`, `docs/components/cn-file-preview.md`, `docs/components/cn-files-card.md`
- **acceptance_criteria**:
  - Without the Viewer, a PDF opens in a new tab and a CSV in the preview
  - Verify: Playwright on the harness without `OCA.Viewer`; `npm run check:public-safe`; `npm run check:docs`, `npm run check:docs-fresh`
- [ ] Implement
- [ ] Test
