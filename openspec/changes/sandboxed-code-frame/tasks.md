# Tasks: sandboxed-code-frame

> Library half of buildiq `pages-custom-code` (REQ-BQCC-003, REQ-BQCC-004);
> rows `pg-custom-js`, `pg-custom-code-component` (buildiq). `kind: code`.
> Checkbox budget: 7 tasks x 2 = 14 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: Manifest keys and refusals
- **spec_ref**: `openspec/changes/sandboxed-code-frame/specs/code-frame/spec.md#requirement-the-manifest-declares-code-and-expressions-in-typed-keys`
- **files**: `src/schemas/app-manifest-v2.schema.json`, `src/utils/validateManifest.js`, `tests/utils/validateManifestCode.spec.js`
- **acceptance_criteria**:
  - `config.code`, the widget `code` block, `columns[].expression`, `expressionDefault` and form `visibleWhen.expression` validate
  - Each refusal of design D1 fails with a message naming the page or widget
  - Verify: jest; `npm run build:validators` leaves no diff
- [ ] Implement
- [ ] Test

### Task 2: The protocol checks
- **spec_ref**: `openspec/changes/sandboxed-code-frame/specs/code-frame/spec.md#requirement-the-page-checks-every-message-from-a-frame`
- **files**: `src/codeFrame/protocol.js`, `tests/codeFrame/protocol.spec.js`
- **acceptance_criteria**:
  - A message fails on the wrong source, an origin other than `"null"`, a wrong channel, over 64 KB, or an unknown type, each tested on its own
  - Verify: jest; mutation check: removing the source check reddens the two-frames test
- [ ] Implement
- [ ] Test

### Task 3: `CnCodeFrame`
- **spec_ref**: `openspec/changes/sandboxed-code-frame/specs/code-frame/spec.md#requirement-a-code-page-or-code-widget-renders-in-a-fixed-sandbox`
- **files**: `src/components/CnCodeFrame/`, `src/components/CnAppRoot/CnAppRoot.vue`, `src/components/index.js`, `src/index.js`, `tests/components/CnCodeFrame.spec.js`, `tests/a11y/CnCodeFrame.a11y.spec.js`
- **acceptance_criteria**:
  - The rendered iframe has `sandbox="allow-scripts"`, no `allow`, `referrerpolicy="no-referrer"` and a `title`
  - No resolver, no user, or a cross-origin URL renders the placeholder and no iframe
  - A second `load` removes the frame and shows the stopped sentence; inputs are posted as JSON copies without any token
  - Verify: jest; `npm run check:a11y`; `npm run check:public-safe` still passes
- [ ] Implement
- [ ] Test

### Task 4: `navigate`, `notice` and `setField`
- **spec_ref**: `openspec/changes/sandboxed-code-frame/specs/code-frame/spec.md#requirement-the-frame-asks-the-page-decides`
- **files**: `src/components/CnCodeFrame/CnCodeFrame.vue`, `tests/components/CnCodeFrameRequests.spec.js`
- **acceptance_criteria**:
  - `navigate` pushes only a manifest page id with its own params; `notice` is plain text, capped and rate-limited
  - `setField` writes the shown record through `saveObject`, refuses a `readOnly` or unknown property, and a 403 shows "You cannot change this record."
  - Verify: jest with a stubbed store; mutation check: taking the record id from the message reddens the IDOR test
- [ ] Implement
- [ ] Test

### Task 5: Code pages and code widgets
- **spec_ref**: `openspec/changes/sandboxed-code-frame/specs/code-frame/spec.md#requirement-a-code-page-or-code-widget-renders-in-a-fixed-sandbox`
- **files**: `src/components/CnPageRenderer/CnPageRenderer.vue`, `src/components/CnWidgetGrid/builtInWidgets.js`, `src/utils/libraryWidgetKeys.js`, `tests/components/CnPageRendererCode.spec.js`
- **acceptance_criteria**:
  - A custom page with `config.code` and a `code` widget mount `CnCodeFrame` with the declared inputs
  - `tests/utils/libraryWidgetKeys.spec.js` stays green with the new key
  - Verify: jest
- [ ] Implement
- [ ] Test

### Task 6: The frame runtimes and the evaluator
- **spec_ref**: `openspec/changes/sandboxed-code-frame/specs/code-frame/spec.md#requirement-expressions-run-in-one-sandboxed-frame-per-page`
- **files**: `src/codeFrame/frameRuntime.js`, `src/codeFrame/evaluatorRuntime.js`, `rollup.config.js`, `package.json`, `src/composables/useExpressionEvaluator.js`, `src/components/CnDataTable/CnDataTable.vue`, `src/components/CnFormPage/CnFormPage.vue`, `src/utils/visibleWhen.js`, `tests/composables/useExpressionEvaluator.spec.js`
- **acceptance_criteria**:
  - The build emits `dist/code-frame/frame-runtime.js` and `dist/code-frame/evaluator-runtime.js` without imports
  - Expression columns, `expressionDefault` and `visibleWhen.expression` take their values from the evaluator; a timeout or error renders the marker, a failed visibility hides the field
  - No page without an expression creates an evaluator frame
  - Verify: jest; `npm run check:build`
- [ ] Implement
- [ ] Test

### Task 7: Docs and an end-to-end check
- **spec_ref**: `openspec/changes/sandboxed-code-frame/specs/code-frame/spec.md#requirement-the-page-checks-every-message-from-a-frame`
- **files**: `docs/components/cn-code-frame.md`, `e2e/code-frame.e2e.js`, `e2e/fixtures/code-frame/`
- **acceptance_criteria**:
  - Docs state the sandbox value, the inputs, the three requests, and what a host must serve
  - A harness page serves a fixture document with a strict policy: a fetch from the frame fails, a `setField` on a read-only record shows the refusal, a self-navigation stops the frame
  - Verify: `npm run check:docs`, `npm run check:docs-fresh`, `npm run test:e2e -- code-frame`
- [ ] Implement
- [ ] Test
