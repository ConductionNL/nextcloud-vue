---
manifest-form-logic
---
status: draft
---
# Manifest form logic — conditional fields, multi-step wizards, validation rules

## Purpose

Extend the v2 manifest's `type: "form"` page config with declarative
conditional visibility (`fields[].visibleWhen`, reusing the existing
shared `$defs.visibleWhen` predicate), multi-step wizard grouping
(`config.steps[]`), and per-field validation rules
(`fields[].validation`), and teach `CnFormPage` to render them: step
indicator + Next/Back with per-step validation gating, live condition
evaluation against form data, NC-standard accessible error surfacing,
and hidden-field exclusion from validation and the submit payload —
all functional in `mode: "public"`.

This is the rendering + schema leaf that `manifest-form-page-type`
deferred and that `cn-form-builder` / OpenBuild's `form-editor-logic`
consume for authoring. Schema changes are additive only: the closed
page-type enum and the `sentinelGuardedValue` recursion stay intact,
and the pre-compiled v2 validator is regenerated.

## ADDED Requirements

### Requirement: REQ-MFL-1 The schema MUST accept `config.steps[]` as ordered key-reference groups

`src/schemas/app-manifest-v2.schema.json` MUST add a typed `steps` property to `pages[].config`: an array (`minItems: 1`) of `{ id, title, description?, fields[] }` objects where `id` and `title` are required non-empty strings, `description` is an optional string, and `fields` is a required array (`minItems: 1`) of non-empty strings referencing `config.fields[].key` values. Step objects MUST set `additionalProperties: false`. The schema `version` MUST bump one sequential minor (2.18.0 → 2.19.0 at time of writing). A manifest WITHOUT `steps` MUST validate exactly as before — the addition is fully backward compatible.

> @e2e exclude unit-tested via jest (schema/validator specs — no browser surface)

#### Scenario: Form page with steps validates
- GIVEN a v2 manifest form page declaring `config.fields` with keys `a`, `b` and `config.steps = [{id: "s1", title: "One", fields: ["a"]}, {id: "s2", title: "Two", fields: ["b"]}]`
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: true, errors: [] }`

#### Scenario: Step missing title rejected
- GIVEN a step entry `{id: "s1", fields: ["a"]}` (no `title`)
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: false }` AND an error whose path points at the step entry

#### Scenario: Step with unknown property rejected
- GIVEN a step entry `{id: "s1", title: "One", fields: ["a"], showIf: {}}`
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: false }` — step objects are closed (`additionalProperties: false`)

#### Scenario: Existing stepless form manifests still validate
- GIVEN the pre-change fixture corpus (`tests/fixtures/manifest-all-types.json`, fleet manifests) with `type: "form"` pages that declare no `steps`
- WHEN `validateManifestV2()` runs
- THEN every previously-valid manifest MUST remain `{ valid: true, errors: [] }`

### Requirement: REQ-MFL-2 `fields[].visibleWhen` MUST reuse the shared `$defs.visibleWhen` predicate

`config.fields[]` items on `type: "form"` pages MUST accept an optional `visibleWhen` property that is a `$ref` to the EXISTING `#/$defs/visibleWhen` definition (`{ endpoint?, source?, field?, op?, value }`, `op ∈ eq|neq|gt|gte|lt|lte`). No new condition grammar, no parallel `$def`, and no change to `$defs.visibleWhen` itself. The `sentinelGuardedValue` recursion over `pages[].config` MUST remain intact and MUST keep applying through the new subtrees.

> @e2e exclude unit-tested via jest (schema/validator specs — no browser surface)

#### Scenario: Field-reference condition validates
- GIVEN a form field `{key: "kvk", label: "KvK", type: "string", visibleWhen: {field: "kind", op: "eq", value: "company"}}`
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: true, errors: [] }`

#### Scenario: Data-source condition validates
- GIVEN a form field whose `visibleWhen` is `{source: {register: "r", schema: "s"}, field: "@total", op: "gt", value: 0}`
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: true, errors: [] }`

#### Scenario: Unknown operator rejected
- GIVEN a form field whose `visibleWhen` is `{field: "kind", op: "contains", value: "x"}`
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: false }` AND an error naming the `op` enum

#### Scenario: Sentinel guard still fires through the new shapes
- GIVEN a form field whose `visibleWhen.value` is the out-of-vocabulary token `"@bogus.token"`
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: false }` — the `sentinelGuardedValue` recursion covers the new subtree

### Requirement: REQ-MFL-3 `fields[].validation` MUST be a closed `{required, min, max, pattern, message}` shape

The schema MUST add a `$defs.fieldValidation` object — `required` (boolean), `min` (number), `max` (number), `pattern` (string, ECMAScript regex source), `message` (string, i18n-able) — with `additionalProperties: false`, `$ref`'d from `config.fields[].validation` on `type: "form"` pages. All properties are optional.

> @e2e exclude unit-tested via jest (schema/validator specs — no browser surface)

#### Scenario: Full validation object accepted
- GIVEN a form field with `validation: {required: true, min: 2, max: 120, pattern: "^[a-z]+$", message: "i18n.bad-name"}`
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: true, errors: [] }`

#### Scenario: Unknown rule key rejected
- GIVEN a form field with `validation: {required: true, minLength: 2}`
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: false }` — the shape is closed so typo'd rule keys surface at validate time

#### Scenario: Non-numeric min rejected
- GIVEN a form field with `validation: {min: "2"}`
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: false }`

### Requirement: REQ-MFL-4 The compiled v2 validator MUST be regenerated from the edited schema

Because `validateManifestV2()` validates against the pre-compiled `src/utils/validateManifestV2.compiled.js` (CSP-safe standalone Ajv module, ADR-036), the schema edits in REQ-MFL-1..3 MUST be followed by `npm run build:validators` and the regenerated module MUST be part of the change. Regeneration MUST be idempotent against the committed output.

> @e2e exclude unit-tested via jest (schema/validator specs — no browser surface)

#### Scenario: Runtime validator accepts the new shapes
- GIVEN a manifest using `steps`, `visibleWhen`, and `validation` per REQ-MFL-1..3
- WHEN `validateManifestV2()` (which consumes the COMPILED module, not the JSON schema) runs
- THEN it MUST return `{ valid: true, errors: [] }` — proving the compiled module was regenerated

#### Scenario: Regeneration is in sync
- GIVEN the committed `src/utils/validateManifestV2.compiled.js`
- WHEN `npm run build:validators` is re-run
- THEN the file MUST NOT change

### Requirement: REQ-MFL-5 `validateManifestV2()` MUST enforce the form-logic cross-shape rules post-schema

`validateManifestV2()` in `src/utils/validateManifest.js` MUST add a post-schema check block (the v2 path does not run the v1 `validateTypeConfig`) for pages with `type: "form"`, pushing errors in the established `/pages/{i}/config/…` path shape:

- `steps[].id` MUST be unique within the page.
- Every `steps[].fields[]` entry MUST match a declared `config.fields[].key`.
- When `steps` is present, every declared field key MUST appear in exactly one step (complete partition — zero-step fields would silently never render; multi-step fields would double-render).
- `validation.min` MUST be `<= validation.max` when both are set.
- `validation.pattern` MUST compile (`new RegExp` try/catch).
- Type-inapplicable rules MUST be errors: `pattern` only on `string`/`password` fields; `min`/`max` only on `string`/`password`/`number` fields.
- A LOCAL-mode `visibleWhen` (neither `endpoint` nor `source`) MUST have a `field` whose first dot-segment matches a declared `config.fields[].key`.

The v1 `form` branch of `validateTypeConfig` MUST NOT change.

> @e2e exclude unit-tested via jest (schema/validator specs — no browser surface)

#### Scenario: Step referencing unknown field key rejected
- GIVEN `config.fields` with keys `a`, `b` and `steps = [{id: "s1", title: "One", fields: ["a", "zz"]}, {id: "s2", title: "Two", fields: ["b"]}]`
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: false }` AND an error naming `"zz"` and the step path

#### Scenario: Field assigned to no step rejected
- GIVEN `config.fields` with keys `a`, `b` and `steps = [{id: "s1", title: "One", fields: ["a"]}]`
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: false }` AND an error naming the unassigned key `"b"`

#### Scenario: Duplicate step ids rejected
- GIVEN two steps both declaring `id: "s1"`
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: false }`

#### Scenario: min greater than max rejected
- GIVEN a field with `validation: {min: 10, max: 2}`
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: false }`

#### Scenario: Non-compiling pattern rejected
- GIVEN a field with `validation: {pattern: "([a-z"}`
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: false }` AND the error MUST include the regex failure hint

#### Scenario: Pattern on a number field rejected
- GIVEN a field `{key: "n", label: "N", type: "number", validation: {pattern: "^[0-9]+$"}}`
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: false }` — `pattern` applies to `string`/`password` fields only

#### Scenario: LOCAL condition referencing undeclared key rejected
- GIVEN a field whose `visibleWhen` is `{field: "knd", op: "eq", value: "x"}` and no field with key `knd` (or first dot-segment `knd`) exists
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: false }` AND an error naming `"knd"`

### Requirement: REQ-MFL-6 CnFormPage MUST render steps with an accessible indicator and Next/Back navigation

`CnFormPage` MUST accept a `steps` prop (default `[]`). When non-empty it MUST render: a step indicator (an ordered list of step titles inside a labelled `<nav>`, the current step's item carrying `aria-current="step"`), only the current step's fields (in the step's `fields[]` order, still honouring `#field-<key>` slot overrides), a Back button (hidden on the first step, never validating), a Next button on all but the last step, and the existing submit button only on the last step. A step whose fields are ALL hidden by conditions MUST be skipped in both directions. Navigation MUST emit `@step` with `{ from, to }`. When `steps` is empty the rendering MUST be byte-for-byte today's single-step form. Styling MUST use NC CSS variables only (nldesign compatible).

#### Scenario: Two-step wizard renders indicator and gates submit to the last step
- GIVEN a form page with two steps
- WHEN CnFormPage mounts
- THEN the DOM MUST contain a step indicator with two entries, the first marked `aria-current="step"`
- AND only the first step's fields MUST be rendered
- AND a Next button MUST be present and the submit button MUST NOT be

#### Scenario: Next and Back move between steps
- GIVEN the two-step wizard with a valid first step
- WHEN the user clicks Next
- THEN the second step's fields MUST render, `@step` MUST have been emitted with `{from: 0, to: 1}`, and Back MUST be visible
- WHEN the user clicks Back
- THEN the first step's fields MUST render again with the user's draft values retained

#### Scenario: Fully-hidden step is skipped
- GIVEN three steps where every field of step 2 is hidden by conditions
- WHEN the user clicks Next from step 1
- THEN the wizard MUST land on step 3

#### Scenario: No steps means today's rendering
- GIVEN a form page without `config.steps`
- WHEN CnFormPage mounts
- THEN no step indicator and no Next/Back buttons MUST render — one field column plus the submit button, as before this change

### Requirement: REQ-MFL-7 Next and Submit MUST be gated by validation of the visible fields in scope

Clicking Next MUST run `validateFieldValue` over the current step's VISIBLE fields; any failure MUST block navigation, populate the per-field errors, and move focus to the first invalid field. Buttons MUST NOT be rendered disabled while invalid (errors must be discoverable, not hidden behind an inert button). Clicking Back MUST never validate. Clicking Submit (last step, or single-step) MUST validate ALL visible fields across ALL steps and, on failure, jump to the earliest step containing an invalid field; the existing endpoint/handler dispatch MUST only run when validation passes. Editing a field MUST clear that field's error.

#### Scenario: Invalid required field blocks Next
- GIVEN step 1 contains a visible field with `validation: {required: true}` and no value
- WHEN the user clicks Next
- THEN the wizard MUST stay on step 1, an error message MUST render for the field, and focus MUST move to that field's input

#### Scenario: Validation failure on submit jumps to the offending step
- GIVEN a two-step wizard where a step-1 field became invalid (its value was cleared via a `#field-<key>` slot after passing Next)
- WHEN the user clicks Submit on step 2
- THEN no dispatch MUST occur and the wizard MUST return to step 1 with the error rendered

#### Scenario: Editing clears the field's error
- GIVEN a field currently showing a validation error
- WHEN the user types a satisfying value
- THEN the error message for that field MUST disappear

### Requirement: REQ-MFL-8 `validateFieldValue` MUST implement the per-type rule semantics

A new pure helper `src/utils/formValidation.js` MUST export `validateFieldValue(field, value, t) → string|null` (null = valid): `required` means non-empty-after-trim for `string`/`password`, finite number for `number`, `true` for `boolean`, selected for `enum`, non-null for `json`; `min`/`max` bound string LENGTH for `string`/`password` and numeric VALUE for `number`; `pattern` tests `string`/`password` values via `new RegExp`. `validation.message` (translated through `t`, like `field.label`) MUST replace the built-in default for whichever rule fails; built-in defaults MUST be translated English msgids.

#### Scenario: Required string with whitespace only fails
- GIVEN `{type: "string", validation: {required: true}}` and value `"   "`
- WHEN `validateFieldValue` runs
- THEN it MUST return the required-field message

#### Scenario: Number bounds use numeric value
- GIVEN `{type: "number", validation: {min: 0, max: 10}}` and value `42`
- WHEN `validateFieldValue` runs
- THEN it MUST return the max message
- AND value `5` MUST return `null`

#### Scenario: String bounds use length
- GIVEN `{type: "string", validation: {min: 2}}` and value `"a"`
- WHEN `validateFieldValue` runs
- THEN it MUST return the min-length message

#### Scenario: Pattern mismatch uses the custom message
- GIVEN `{type: "string", validation: {pattern: "^[0-9]{8}$", message: "i18n.kvk-invalid"}}` and value `"12ab"`
- WHEN `validateFieldValue` runs with a translator
- THEN it MUST return the translated `"i18n.kvk-invalid"` — not the built-in pattern message

#### Scenario: Required boolean must be true
- GIVEN `{type: "boolean", validation: {required: true}}` and value `false`
- WHEN `validateFieldValue` runs
- THEN it MUST return the required-field message

### Requirement: REQ-MFL-9 Field conditions MUST evaluate against live form data with declaration-order cascade

`CnFormPage` MUST evaluate LOCAL-mode `visibleWhen` conditions (neither `endpoint` nor `source`) synchronously on every form-data change, via a new `evaluateVisibleWhenLocal(cond, data)` export in `src/utils/visibleWhen.js` composed from the existing `readVisibleWhenPath` + `compareVisibleWhen` helpers (nullish condition → `true`; malformed condition → `false`, mirroring the async fail-safe). The condition's `field` resolves as a dot-path into the live `formData` object. Chained conditions MUST evaluate in a single pass in field DECLARATION order against the effective (visibility-filtered) data: a hidden field's value reads as `undefined` for every later field's condition, so hiding cascades; a condition referencing a later-declared field sees that field's raw value (no fix-point iteration). `endpoint` / `source` conditions MUST be evaluated once at mount via the existing fail-safe `evaluateVisibleWhen()` (error → hidden) and cached; they MUST NOT re-evaluate per keystroke.

#### Scenario: Field appears when its condition becomes true
- GIVEN field `kvk` with `visibleWhen: {field: "kind", op: "eq", value: "company"}` and `kind` currently `"person"`
- WHEN the user sets `kind` to `"company"`
- THEN the `kvk` input MUST appear without a remount of the form

#### Scenario: Chained hide cascades
- GIVEN `b.visibleWhen = {field: "a", op: "eq", value: "x"}` and `c.visibleWhen = {field: "b", op: "eq", value: "y"}` with `a = "x"` and `b = "y"` (both visible, `c` visible)
- WHEN the user sets `a` to `"z"`
- THEN `b` MUST hide AND `c` MUST also hide — `b` reads as `undefined` for `c`'s condition

#### Scenario: Data-source condition evaluated once, fail-safe hidden
- GIVEN a field with `visibleWhen: {endpoint: "/broken", field: "flag", op: "eq", value: true}` whose fetch rejects
- WHEN CnFormPage mounts
- THEN the field MUST be hidden (fail-safe) AND typing in other fields MUST NOT re-trigger the fetch

### Requirement: REQ-MFL-10 Hidden fields MUST be excluded from validation and the submit payload, with draft values retained

A field hidden by its `visibleWhen` MUST be skipped by Next/Submit validation and MUST be absent from the dispatched form data (endpoint body or handler `formData` argument) — the payload equals what the user saw. The hidden field's draft value MUST be retained in component state so re-satisfying the condition restores it. This is the spec-fixed decision: stale drafts of retracted answers never reach the backend, and a `required` rule on an invisible field can never soft-lock the form.

#### Scenario: Hidden required field does not block submit
- GIVEN field `kvk` with `validation: {required: true}` hidden because `kind = "person"`
- WHEN the user clicks Submit with all visible fields valid
- THEN the dispatch MUST run — the hidden `kvk` is not validated

#### Scenario: Hidden field's value excluded from payload
- GIVEN the user typed `"12345678"` into `kvk` while visible, then flipped `kind` back to `"person"` (hiding it)
- WHEN the user submits
- THEN the dispatched form data MUST NOT contain the `kvk` key

#### Scenario: Draft restored when the condition re-satisfies
- GIVEN the hidden `kvk` from the previous scenario
- WHEN the user sets `kind` to `"company"` again
- THEN the `kvk` input MUST reappear pre-filled with `"12345678"`

### Requirement: REQ-MFL-11 Validation errors MUST render through NC-standard accessible patterns

`cnRenderFormField` (`src/composables/cnFormFieldRenderer.js`) MUST accept an optional `error` argument; when set, the returned bindings MUST include the NC-standard input error props (`error: true`, `helperText: <message>`) on components that support them (the `NcTextField` / `NcTextArea` / NcInputField family). For widgets without native error props (boolean switch, `NcSelect`, `CnJsonViewer`, the native-`textarea` fallback) and for `#field-<key>` slot overrides, `CnFormPage` MUST render an adjacent `role="alert"` error element referenced from the input wrapper via `aria-describedby`, using `var(--color-error)`. The `#field-<key>` scoped slot MUST additionally receive `error` so custom inputs can surface it.

#### Scenario: Text field failure uses NcInputField error props
- GIVEN a `string` field failing `required`
- WHEN validation runs on Next
- THEN the field's `NcTextField` MUST receive `error: true` and `helperText` equal to the message

#### Scenario: Select failure renders an alert element
- GIVEN an `enum` field failing `required`
- WHEN validation runs
- THEN an element with `role="alert"` containing the message MUST render adjacent to the select, wired via `aria-describedby`

#### Scenario: Slot override receives the error
- GIVEN a `#field-rating` scoped slot and a failing `rating` validation
- WHEN validation runs
- THEN the slot's scoped props MUST include the error message

### Requirement: REQ-MFL-12 Form logic MUST work in public mode and through CnWidgetFormRenderer

All step / condition / validation behaviour MUST function identically under `mode: "public"` (see `manifest-public-mode`) — the logic is client-side, so token-scoped unauthenticated forms get the full wizard; the public-mode success banner and form-hide MUST fire only after the FINAL step's successful dispatch. `CnWidgetFormRenderer` (the v2 `form-renderer` built-in widget) MUST declare and forward the `steps` prop to the inner `CnFormPage` (its `innerProps` forwards `$props` minus chrome, so the prop must be declared; `visibleWhen` / `validation` travel inside `fields` and need no wiring).

#### Scenario: Public-mode wizard submits and banners on the last step only
- GIVEN a two-step form with `mode: "public"`
- WHEN the user completes step 1 and clicks Next
- THEN no success banner MUST render
- WHEN the user completes step 2 and Submit dispatches successfully
- THEN the success banner MUST render and the form MUST hide (existing public-mode behaviour)

#### Scenario: form-renderer widget forwards steps
- GIVEN a v2 dashboard widget `{widgetKey: "form-renderer"}` whose props include `steps` with two entries
- WHEN the widget mounts
- THEN the embedded CnFormPage MUST render the two-step indicator
