# Tasks: manifest-i18n-labels

> Library half of buildiq `experience-multilingual-apps` (T01, D1, D2,
> REQ-BQML-003, REQ-BQML-004); row `ux-multilingual-ui` (buildiq).
> `kind: code`.
> Checkbox budget: 5 tasks x 2 = 10 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: The `i18n` block
- **spec_ref**: `openspec/changes/manifest-i18n-labels/specs/manifest-i18n/spec.md#requirement-the-manifest-accepts-an-i18n-block`
- **files**: `src/schemas/app-manifest-v2.schema.json`, `src/utils/validateManifest.js`, `tests/utils/validateManifestI18n.spec.js`
- **acceptance_criteria**:
  - The block validates; an undeclared label language and a source language inside `languages` fail with a message naming them
  - Verify: jest; `npm run build:validators` leaves no diff
- [x] Implement
- [x] Test

### Task 2: The lookup and the root
- **spec_ref**: `openspec/changes/manifest-i18n-labels/specs/manifest-i18n/spec.md#requirement-the-root-looks-labels-up-in-the-manifest-first`
- **files**: `src/utils/manifestTranslate.js`, `src/components/CnAppRoot/CnAppRoot.vue`, `tests/utils/manifestTranslate.spec.js`, `tests/components/CnAppRootI18n.spec.js`
- **acceptance_criteria**:
  - Order: manifest language, base language, host `translate`, written text; placeholders filled; source language skips the manifest
  - `language` overrides `getLanguage()`; an edit to `i18n.labels` in the working copy re-renders the label; `CnWalkthrough` receives the lookup
  - Verify: jest; mutation check: swapping steps 1 and 2 reddens the per-label fallback test
- [x] Implement
- [x] Test

### Task 3: Form page and field options
- **spec_ref**: `openspec/changes/manifest-i18n-labels/specs/manifest-i18n/spec.md#requirement-every-manifest-label-passes-the-lookup`
- **files**: `src/components/CnFormPage/CnFormPage.vue`, `src/composables/cnFormFieldRenderer.js`, `tests/components/CnFormPageI18n.spec.js`
- **acceptance_criteria**:
  - With no `translate` prop, `CnFormPage` uses the injected `cnTranslate` for labels, help, steps, submit and success text
  - Enum and option labels pass the translator
  - Verify: jest
- [x] Implement
- [x] Test

### Task 4: Actions, sidebars, sections and page titles
- **spec_ref**: `openspec/changes/manifest-i18n-labels/specs/manifest-i18n/spec.md#requirement-every-manifest-label-passes-the-lookup`
- **files**: `src/components/CnRowActions/CnRowActions.vue`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnActionsBar/CnActionsBar.vue`, `src/components/CnIndexSidebar/CnIndexSidebar.vue`, `src/components/CnObjectSidebar/CnObjectSidebar.vue`, `src/components/CnRelatedCollections/CnRelatedCollections.vue`, `src/components/CnSearchPage/CnSearchPage.vue`, `src/components/CnStorePage/CnStorePage.vue`, `tests/components/manifestLabelsTranslated.spec.js`
- **acceptance_criteria**:
  - Each label in design D4 renders translated with a stub `cnTranslate`; row action test ids stay on the written label
  - The index page dispatch context carries `translate`, so row action toasts translate
  - A fallback label carries `lang` set to `sourceLanguage`
  - Verify: jest, one case per component
- [x] Implement — `CnDetailPage` needed no change: it forwards the title and tab labels to `CnObjectSidebar`, which now translates them
- [x] Test — jest, one case per component

### Task 5: Docs and an end-to-end check
- **spec_ref**: `openspec/changes/manifest-i18n-labels/specs/manifest-i18n/spec.md#requirement-the-root-looks-labels-up-in-the-manifest-first`
- **files**: `docs/components/cn-app-root.md`, `docs/i18n/manifest-labels.md`, `e2e/manifest-i18n.e2e.js`
- **acceptance_criteria**:
  - Docs show the block, the lookup order and the `language` prop
  - A harness manifest in Dutch with English labels renders an index, a detail and a form page in English with `language: "en"`
  - Verify: `npm run check:docs`, `npm run check:docs-fresh`, `npm run test:e2e -- manifest-i18n`
- [x] Implement — docs written; `e2e/manifest-i18n.e2e.js` is not written: needs a browser harness
- [ ] Test — `npm run check:docs` run; `check:docs-fresh` is not run (the orchestrator regenerates docs/components/_generated); the Playwright run is not run: needs a browser
