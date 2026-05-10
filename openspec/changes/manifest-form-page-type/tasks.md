# Tasks: Manifest form page type

## Phase 1 — Schema + validator

- [x] Update `src/schemas/app-manifest.schema.json`:
      - Extend the `pages[].type` description to enumerate `form`
        alongside the existing types.
      - Extend the `pages[].config` description to spell out the
        `type: "form"` shape (`fields[]`, `submitHandler` xor
        `submitEndpoint`, `submitMethod`, `mode`, `submitLabel`,
        `successMessage`, `initialValue`).
      - Do NOT bump the schema's top-level `version` — the additive
        type-description policy is the same as
        `manifest-settings-rich-sections`.
- [x] Update `src/utils/validateManifest.js`'s `validateTypeConfig`:
      add a `'form'` branch. Required: `fields[]` non-empty array;
      exactly one of `submitHandler | submitEndpoint`; `submitMethod`
      (when set) ∈ {POST, PUT, PATCH}; `mode` (when set) ∈ {edit,
      create, public}.
- [x] Add ≥4 new test cases to
      `tests/schemas/app-manifest.schema.spec.js`:
      bare-form-valid, missing-fields-rejected,
      both-handler-and-endpoint-rejected, bad-method-rejected,
      bad-mode-rejected.

## Phase 2 — Field-renderer helper

- [x] Create `src/composables/cnFormFieldRenderer.js`:
      A small render-function (or thin wrapper component) that maps
      a `formField` shape to one of `NcCheckboxRadioSwitch`,
      `NcTextField` (string/number/password), `NcSelect` (enum),
      `NcTextArea` (`field.widget === 'textarea'`), `CnJsonViewer`
      (json — read-only).
      Exports `cnRenderFormField({ field, value, onInput, t })`.
- [x] Unit tests for the helper:
      one test per supported `field.type` + the `widget: "textarea"`
      override + the unknown-type fallback (`console.warn` +
      NcTextField).

## Phase 3 — CnFormPage component

- [x] Create `src/components/CnFormPage/CnFormPage.vue`:
      - Renders CnPageHeader (title, description) overridable via
        `#header`.
      - Renders `fields[]` via the new helper.
      - Renders submit + (optional) reset button.
      - Wires endpoint-mode dispatch (`axios[method](url, data)`) and
        handler-mode dispatch (`cnCustomComponents[name](data, $route, $router)`).
      - Displays `lastError` + `successMessage` blocks.
      - Emits `@submit`, `@error`, `@input`.
      - Exposes `#header`, `#actions`, `#field-<key>`, `#submit` slots.
- [x] Create `src/components/CnFormPage/index.js` barrel.
- [x] Add docblock at the top of `CnFormPage.vue` documenting the
      contract (mirroring CnSettingsPage's docblock).
- [x] Export `CnFormPage` from `src/components/index.js`.

## Phase 4 — Renderer wiring

- [x] Update `src/components/CnPageRenderer/pageTypes.js`:
      add `form: defineAsyncComponent(() => import('../CnFormPage/CnFormPage.vue').then(m => m.default))`.
- [x] Update `src/components/CnPageRenderer/CnPageRenderer.vue`'s
      type-prop forwarding so `type: "form"` pages get the right
      props from `page.config` (fields, submitHandler,
      submitEndpoint, …).

## Phase 5 — Tests

- [x] Add `tests/components/CnFormPage.spec.js` with at least:
      - Renders one input per field; types map to expected widgets
      - `widget: "textarea"` renders an NcTextArea (or the textarea
        fallback in the test stub set)
      - Submit via `submitEndpoint` calls `axios.post(url, formData)`
      - Submit via `submitHandler` calls the registered handler
        with `(formData, $route, $router)`
      - Endpoint mode resolves `:param` segments from `$route.params`
      - Error from submit surfaces in the error block + emits `@error`
      - Success surfaces `successMessage` + emits `@submit`
      - `#field-<key>` slot replaces the input for that field
      - `#header` slot overrides CnPageHeader
- [x] Update `tests/components/CnPageRenderer.spec.js`:
      add a `type: "form"` entry to the sample manifest and assert
      that the renderer mounts the form page.

## Phase 6 — Docs

- [x] Add `docs/components/cn-form-page.md` covering: what it is,
      when to use it (vs settings page vs custom), prop reference,
      slot reference, both submit-mode examples, the `:param`
      substitution rule, and a worked pipelinq `PublicSurvey`
      example.
- [x] Update `docs/migrating-to-manifest.md`:
      add a "Runtime form rendering" subsection pointing at
      CnFormPage; spell out which form-shaped routes belong on
      `type: "form"` and which still need `type: "custom"`.
- [x] Run `npm run check:docs` — should pass with the new
      `cn-form-page.md` covering the new component.

## Phase 7 — Verification

- [x] Run `npm test` — all suites pass (existing + new).
- [x] Run `npm run check:docs` — passes.
- [x] Run `npx eslint src/components/CnFormPage src/composables/cnFormFieldRenderer.js tests/components/CnFormPage.spec.js` — passes.
- [x] Stage + commit the change. Do NOT push from this task. Do NOT
      add `Co-Authored-By` trailers.
