# Tasks: app-diagnostics-channel

> Library half of buildiq `operate-debug-log-and-monitoring` (T01,
> REQ-BQDM-001, REQ-BQDM-002); rows `lc-debug-log`,
> `ops-performance-monitor` (buildiq). `kind: code`.
> Checkbox budget: 5 tasks x 2 = 10 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: The helper and the root prop
- **spec_ref**: `openspec/changes/app-diagnostics-channel/specs/app-diagnostics/spec.md#requirement-the-app-root-takes-an-optional-diagnostics-function`
- **files**: `src/utils/diagnostics.js`, `src/components/CnAppRoot/CnAppRoot.vue`, `tests/utils/diagnostics.spec.js`, `tests/components/CnAppRootDiagnostics.spec.js`
- **acceptance_criteria**:
  - The path cleaner keeps query keys and drops values; the safe call drops a throwing listener with one warning
  - `CnAppRoot` adds its listener on create, removes it on destroy, and provides `cnDiagnostics`
  - Verify: jest; mutation check: calling the listener synchronously without `try` reddens the broken-listener test
- [x] Implement
- [x] Test

### Task 2: Store and cnFetch requests
- **spec_ref**: `openspec/changes/app-diagnostics-channel/specs/app-diagnostics/spec.md#requirement-every-store-and-cnfetch-request-is-reported`
- **files**: `src/store/useObjectStore.js`, `src/store/plugins/*.js`, `src/utils/cnFetch.js`, `tests/store/useObjectStoreDiagnostics.spec.js`
- **acceptance_criteria**:
  - Every `fetch` in the store and its plugins goes through `_request`; `grep -n "await fetch(" src/store` finds only `_request`
  - Reports carry method, path, status, duration, rows and source; a network error reports status 0; two roots both hear a request
  - Verify: jest with a stubbed `fetch`; with no listener, `performance.now` is not called
- [x] Implement
- [x] Test

### Task 3: Render errors and unknown components
- **spec_ref**: `openspec/changes/app-diagnostics-channel/specs/app-diagnostics/spec.md#requirement-render-errors-and-unknown-components-are-reported`
- **files**: `src/components/CnPageRenderer/CnPageRenderer.vue`, `src/components/CnWidgetGrid/CnWidgetGrid.vue`, `tests/components/CnPageRendererDiagnostics.spec.js`
- **acceptance_criteria**:
  - A throwing widget reports `render-error` and the error still reaches the app's `errorHandler`
  - The four unknown-component sites report with `where`
  - Verify: jest
- [x] Implement
- [x] Test

### Task 4: Binding problems
- **spec_ref**: `openspec/changes/app-diagnostics-channel/specs/app-diagnostics/spec.md#requirement-binding-problems-are-reported-once-per-page-visit`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnDetailPage/CnDetailPage.vue`, `src/store/useObjectStore.js`, `tests/components/CnIndexPageBinding.spec.js`
- **acceptance_criteria**:
  - A missing column or `includeFields` property reports once; `@self.*`, dotted, aggregate and expression keys do not
  - A 404 schema or register reports `missing-schema` or `missing-register`
  - Verify: jest
- [x] Implement
- [x] Test

### Task 5: Docs
- **spec_ref**: `openspec/changes/app-diagnostics-channel/specs/app-diagnostics/spec.md#requirement-the-app-root-takes-an-optional-diagnostics-function`
- **files**: `docs/components/cn-app-root.md`, `docs/utilities/diagnostics.md`
- **acceptance_criteria**:
  - Docs list every report kind with its fields, and state what a report never holds
  - Verify: `npm run check:docs`, `npm run check:docs-fresh`
- [x] Implement
- [x] Test
