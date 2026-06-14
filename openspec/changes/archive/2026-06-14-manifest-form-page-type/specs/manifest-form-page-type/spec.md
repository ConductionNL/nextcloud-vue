---
manifest-form-page-type
---
status: draft
---
# Manifest form page type

## Purpose

Add a new built-in page type `form` to the app-manifest renderer,
filling the runtime-form-rendering gap that today forces every
consumer's public-form / runtime-survey routes to fall back to
`type: "custom"`. The new type renders a manifest-declared field set
plus a submit button, dispatching the form data through one of two
exits (HTTP endpoint or registered JS handler).

This change is the form-rendering counterpart to
`manifest-settings-rich-sections` for the settings page; it does
NOT cover form-builder authoring UIs (which need bespoke editor
chrome and stay `type: "custom"`).

## ADDED Requirements

### Requirement: The schema MUST document `form` as an accepted `pages[].type` value

`src/schemas/app-manifest.schema.json` MUST extend the description on `pages[].type` to enumerate `form` alongside the existing values. The `pages[].config` description MUST also enumerate the `type: "form"` config keys (`fields[]`, `submitHandler`, `submitEndpoint`, `submitMethod`, `mode`, `submitLabel`, `successMessage`, `initialValue`). The schema's top-level `version` field MUST NOT bump — this is purely additive enrichment within the existing v1.x surface, mirroring the policy `manifest-settings-rich-sections` followed.

#### Scenario: Manifest with type=form validates
- GIVEN a manifest declaring `pages[0].type = "form"` with `config.fields` non-empty and `config.submitHandler` set
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: true, errors: [] }`

#### Scenario: Existing manifests still validate
- GIVEN a manifest using only previously-accepted `type` values
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: true, errors: [] }` — no new error from the description enrichment

### Requirement: `form` pages MUST declare a non-empty `fields[]` array

A `pages[]` entry with `type: "form"` MUST include `config.fields[]` as a non-empty array. Each element MUST conform to the existing `formField` `$def` (the same `$def` `pages[].config.sections[].fields[]` references for `type: "settings"`).

#### Scenario: Form page with valid fields
- GIVEN `{type: "form", config: {fields: [{key: "name", label: "i18n.name", type: "string"}], submitHandler: "submit"}}`
- WHEN validated
- THEN MUST be valid

#### Scenario: Form page missing fields rejected
- GIVEN `{type: "form", config: {submitHandler: "submit"}}`
- WHEN validated
- THEN MUST return error `pages[N].config: form pages must declare a non-empty fields[] array`

#### Scenario: Form page with empty fields rejected
- GIVEN `{type: "form", config: {fields: [], submitHandler: "submit"}}`
- WHEN validated
- THEN MUST return error `pages[N].config: form pages must declare a non-empty fields[] array`

### Requirement: `form` pages MUST declare exactly one of submitHandler | submitEndpoint

A `pages[]` entry with `type: "form"` MUST declare exactly one of `config.submitHandler` (registry name) OR `config.submitEndpoint` (URL string). Setting both, or neither, MUST be a validator error.

#### Scenario: Form page with submitEndpoint only
- GIVEN `{type: "form", config: {fields: [...], submitEndpoint: "/api/forms"}}`
- WHEN validated
- THEN MUST be valid

#### Scenario: Form page with submitHandler only
- GIVEN `{type: "form", config: {fields: [...], submitHandler: "submitForm"}}`
- WHEN validated
- THEN MUST be valid

#### Scenario: Form page with neither rejected
- GIVEN `{type: "form", config: {fields: [...]}}`
- WHEN validated
- THEN MUST return error `pages[N].config: form pages must declare exactly one of submitHandler | submitEndpoint`

#### Scenario: Form page with both rejected
- GIVEN `{type: "form", config: {fields: [...], submitHandler: "x", submitEndpoint: "/api"}}`
- WHEN validated
- THEN MUST return error `pages[N].config: form pages must declare exactly one of submitHandler | submitEndpoint`

### Requirement: `form` pages with submitMethod MUST use POST | PUT | PATCH

When `pages[].config.submitMethod` is set on a `type: "form"` page, it MUST be one of `POST`, `PUT`, `PATCH` (case-insensitive at the validator, the component normalises). Other HTTP verbs MUST be rejected.

#### Scenario: Valid submitMethod accepted
- GIVEN `{type: "form", config: {fields: [...], submitEndpoint: "/api", submitMethod: "PUT"}}`
- WHEN validated
- THEN MUST be valid

#### Scenario: GET rejected
- GIVEN `{type: "form", config: {fields: [...], submitEndpoint: "/api", submitMethod: "GET"}}`
- WHEN validated
- THEN MUST return error `pages[N].config.submitMethod: must be one of POST | PUT | PATCH`

### Requirement: `form` pages with mode MUST use edit | create | public

When `pages[].config.mode` is set on a `type: "form"` page, it MUST be one of `edit`, `create`, `public`. Other values MUST be rejected.

#### Scenario: Valid mode accepted
- GIVEN `{type: "form", config: {fields: [...], submitHandler: "x", mode: "public"}}`
- WHEN validated
- THEN MUST be valid

#### Scenario: Invalid mode rejected
- GIVEN `{type: "form", config: {fields: [...], submitHandler: "x", mode: "review"}}`
- WHEN validated
- THEN MUST return error `pages[N].config.mode: must be one of edit | create | public`

### Requirement: `defaultPageTypes` MUST register `form` → `CnFormPage`

`src/components/CnPageRenderer/pageTypes.js` MUST add `form` as a key mapping to a `defineAsyncComponent`-wrapped `CnFormPage` import. The async unwrap pattern (`.then(m => m.default)`) MUST mirror the other entries to avoid the Vue 2 frozen-namespace mutation bug documented in that file's docblock.

#### Scenario: Renderer dispatches form pages to CnFormPage
- GIVEN a manifest with `pages[0] = {id: "f", route: "/f", type: "form", config: {fields: [...], submitHandler: "x"}}`
- AND CnPageRenderer mounted with `$route.name === "f"`
- WHEN the renderer resolves the page
- THEN it MUST mount the CnFormPage component (not a custom-component fallback)

### Requirement: CnFormPage MUST render one input per field, dispatching by `field.type`

`CnFormPage` MUST render its `fields[]` prop, mapping each field's `type` to one of: `boolean` → NcCheckboxRadioSwitch, `number` → NcTextField type=number, `password` → NcTextField type=password, `string` → NcTextField (default), `enum` → NcSelect, `json` → CnJsonViewer (read-only). When `field.widget === "textarea"`, the renderer MUST use NcTextArea instead of NcTextField. Unknown `field.type` values MUST emit a `console.warn` and fall back to NcTextField.

#### Scenario: Boolean field renders checkbox
- GIVEN `fields = [{key: "agree", type: "boolean", label: "Agree"}]`
- WHEN CnFormPage mounts
- THEN the rendered DOM MUST contain a checkbox-style input bound to `formData.agree`

#### Scenario: Textarea widget hint
- GIVEN `fields = [{key: "comment", type: "string", widget: "textarea", label: "Comment"}]`
- WHEN CnFormPage mounts
- THEN the rendered DOM MUST contain a textarea (not a single-line input)

### Requirement: CnFormPage submit MUST dispatch to handler OR endpoint

When the user clicks submit, `CnFormPage` MUST dispatch the form data through exactly one of two paths:

- **Handler mode** — when `submitHandler` (string) is set: resolve the name against `cnCustomComponents`, call the resolved value with `(formData, $route, $router)`.
- **Endpoint mode** — when `submitEndpoint` (string) is set: replace any `:paramName` segments with `$route.params[paramName]`, then call `axios[submitMethod](url, formData)` (default method `POST`).

If both are set, endpoint mode wins (defensive — the validator already rejects this; the component is loose so a stale manifest doesn't crash). If neither is set, submit MUST emit `@error` with a clear "no submit destination configured" message.

#### Scenario: Handler-mode submit dispatches to registered function
- GIVEN `submitHandler = "submitSurvey"` AND `cnCustomComponents.submitSurvey` is a function
- AND form fields are filled
- WHEN the user clicks submit
- THEN `cnCustomComponents.submitSurvey` MUST be called with `(formData, $route, $router)`

#### Scenario: Endpoint-mode submit posts to URL
- GIVEN `submitEndpoint = "/api/forms"` AND no `submitHandler`
- AND form fields are filled
- WHEN the user clicks submit
- THEN `axios.post("/api/forms", formData)` MUST be called

#### Scenario: Endpoint-mode resolves :param substitution
- GIVEN `submitEndpoint = "/api/survey/:token"` AND `$route.params = {token: "abc123"}`
- WHEN the user clicks submit
- THEN `axios.post("/api/survey/abc123", formData)` MUST be called

### Requirement: CnFormPage MUST emit lifecycle events

`CnFormPage` MUST emit:

- `@input` with `{ key, value }` whenever a field changes.
- `@submit` with the submitted formData when the dispatch resolves successfully.
- `@error` with the error object when the dispatch fails.

#### Scenario: Successful submit emits @submit
- GIVEN a configured form whose dispatch resolves
- WHEN the user clicks submit
- THEN the component MUST emit `@submit` with the form data

#### Scenario: Failed submit emits @error
- GIVEN a configured form whose dispatch rejects
- WHEN the user clicks submit
- THEN the component MUST emit `@error` with the rejected error
- AND the error message MUST be visible in the rendered DOM

### Requirement: CnFormPage MUST expose header / actions / per-field / submit slots

`CnFormPage` MUST expose:

- `#header` — overrides the default CnPageHeader. Scope: `{ title, description }`.
- `#actions` — right-aligned actions area; the renderer wires
  `pages[].actionsComponent` here.
- `#field-<key>` — replaces the input for a specific field. Scope:
  `{ field, value, onInput }`. Same shape CnSettingsPage exposes.
- `#submit` — replaces the submit button. Scope:
  `{ submitting, dirty, submit }`.

#### Scenario: #field slot overrides the default input
- GIVEN `fields = [{key: "rating", type: "number"}]`
- AND a `#field-rating` scoped slot is supplied
- WHEN CnFormPage mounts
- THEN the slot MUST render in place of the default NcTextField for `rating`
- AND the default NcTextField for `rating` MUST NOT be in the DOM
