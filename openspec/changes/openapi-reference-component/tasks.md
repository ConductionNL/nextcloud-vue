# Tasks: openapi-reference-component

> Library half of buildiq `operate-api-docs` (D2, REQ-BQAD-003);
> row `ops-api-docs` (buildiq). `kind: code`.
> Checkbox budget: 4 tasks x 2 = 8 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: `openApiModel.js`
- **spec_ref**: `openspec/changes/openapi-reference-component/specs/api-reference/spec.md#requirement-the-reference-loads-nothing-from-outside-the-instance`
- **files**: `src/utils/openApiModel.js`, `tests/utils/openApiModel.spec.js`, `tests/fixtures/openapi/`
- **acceptance_criteria**:
  - Groups by first tag with "Other"; resolves `#/` references; marks other references external; stops cycles
  - Detects 3.0, 3.1, Swagger 2.0 and non-OpenAPI input
  - Verify: jest with an OpenRegister-shaped 3.1 fixture and a cyclic fixture
- [x] Implement
- [x] Test

### Task 2: `CnApiReference` and its parts
- **spec_ref**: `openspec/changes/openapi-reference-component/specs/api-reference/spec.md#requirement-the-reference-shows-every-call-of-the-document`
- **files**: `src/components/CnApiReference/`, `src/components/index.js`, `src/index.js`, `tests/components/CnApiReference.spec.js`
- **acceptance_criteria**:
  - Header, security sentence, groups, calls, fields and models render from the fixture; a call body mounts only when opened
  - The filter narrows the list and updates the status line
  - No `fetch` or axios call happens during mount, open or filter
  - Verify: jest with `fetch` and axios spied to assert zero calls; `npm run check:smoke`
- [x] Implement
- [x] Test

### Task 3: Download, versions and keyboard
- **spec_ref**: `openspec/changes/openapi-reference-component/specs/api-reference/spec.md#requirement-the-reference-works-from-the-keyboard`
- **files**: `src/components/CnApiReference/CnApiReference.vue`, `tests/components/CnApiReferenceDownload.spec.js`, `tests/a11y/CnApiReference.a11y.spec.js`
- **acceptance_criteria**:
  - The download names and content match the spec; `downloadable: false` hides it; Swagger 2.0 shows the sentence
  - Calls are buttons with `aria-expanded`; tables have captions; the status line is a polite live region
  - Verify: jest; `npm run check:a11y`
- [x] Implement
- [x] Test (jest; `npm run check:a11y` not run)

### Task 4: Docs and an end-to-end check
- **spec_ref**: `openspec/changes/openapi-reference-component/specs/api-reference/spec.md#requirement-the-reference-loads-nothing-from-outside-the-instance`
- **files**: `docs/components/cn-api-reference.md`, `e2e/api-reference.e2e.js`
- **acceptance_criteria**:
  - Docs show the props, the `#intro` slot and what the component never loads
  - A harness page renders the fixture; Playwright records every request and finds none to another host while the reader opens calls and filters
  - Verify: `npm run check:docs`, `npm run check:docs-fresh`, `npm run test:e2e -- api-reference`
- [x] Implement
- [ ] Test — not run: needs the harness and `npm run test:e2e` (zero requests is asserted in jest)
