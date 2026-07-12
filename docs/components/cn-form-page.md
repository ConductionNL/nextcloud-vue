---
sidebar_position: 14
---

# CnFormPage

A manifest-driven runtime form. Renders a flat `fields[]` array plus a submit button declared in `pages[].config` for `type: "form"` pages. Closes the gap that forces every consumer's runtime-form route (public surveys, "request a quote" pages, ticket-create routes that don't need a detail-page round-trip) onto `type: "custom"`.

Mounted automatically by `CnPageRenderer` when a manifest page declares `type: "form"`. Field rendering is delegated to `cnRenderFormField` from `@conduction/nextcloud-vue/composables` so the same input set `CnSettingsPage` uses (boolean, number, string, password, enum, json) is available without duplication. Submit dispatch picks one of two paths depending on which prop is set:

- `submitEndpoint` — the page calls `axios[method](url, payload)` with `:paramName` segments resolved against `$route.params`.
- `submitHandler` — the page resolves the name in the customComponents registry and calls the resolved value with `(payload, $route, $router)`.

`payload` above is the **effective payload** — `formData` with any field currently hidden by a `visibleWhen` condition removed (see "Conditional fields" below).

**Wraps**: `CnPageHeader`, `NcButton`, `NcLoadingIcon`, plus the input components the field-renderer dispatches to (`NcCheckboxRadioSwitch`, `NcTextField`, `NcSelect`, `CnJsonViewer`, optionally `NcTextArea`).

Since manifest-form-logic, `type: "form"` pages also support multi-step wizards (`config.steps[]`), conditional field visibility (`fields[].visibleWhen`), and per-field validation rules (`fields[].validation`) — all three are additive: a manifest with none of them renders exactly as before.

## When to use this page type

| Surface | Page type |
|---------|-----------|
| Admin / config persistence (writes to `IAppConfig`) | `type: "settings"` (`CnSettingsPage`) |
| End-user form, single submit, manifest-declarable fields | `type: "form"` (this component) |
| Form *builder* / authoring UI (drag-drop questions, branching logic) | `type: "custom"` — bespoke component |
| Detail page editing on a known register/schema | `type: "detail"` (`CnDetailPage`) |

Use `type: "form"` when the entire route is "render this list of fields, send the result somewhere." If the form needs sections, save/discard chrome, or per-field IAppConfig persistence, reach for `type: "settings"` instead.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fields` | Array | `[]` | Form fields. Each MUST conform to the `formField` `$def`; optionally carries `visibleWhen` and `validation` (see below) |
| `steps` | Array | `[]` | Multi-step wizard groups: `{ id, title, description?, fields: string[] }[]`. `fields[]` entries are KEY REFERENCES into the `fields` prop. Empty (the default) renders today's single-step form unchanged — no step indicator, no Next/Back |
| `submitHandler` | String | `''` | Registered handler name resolved against the customComponents registry |
| `submitEndpoint` | String | `''` | URL the form data is dispatched to. `:paramName` segments resolve from `$route.params` |
| `submitMethod` | String | `'POST'` | HTTP method for endpoint mode. Must be `POST | PUT | PATCH` |
| `mode` | String | `'public'` | `edit | create | public`. `public` shows the success banner and hides the form on submit |
| `submitLabel` | String | `'Submit'` | Submit button label (i18n key) |
| `successMessage` | String | `'Thank you!'` | Success banner copy (i18n key) |
| `initialValue` | Object | `{}` | Pre-filled form state. Used by `mode: "edit"` |
| `title` | String | `''` | Page title forwarded to `CnPageHeader` |
| `description` | String | `''` | Page description forwarded to `CnPageHeader` |
| `translate` | Function | `null` | Optional translator applied to field labels and i18n keys |
| `customComponents` | Object | `null` | Explicit registry override. Takes precedence over injected `cnCustomComponents` |

`submitHandler` and `submitEndpoint` are mutually exclusive at the validator level. The component itself prefers `submitEndpoint` when both are set so a stale manifest doesn't crash.

## Manifest example — public survey (handler mode)

```json
{
  "id": "PublicSurvey",
  "route": "/public/survey/:token",
  "type": "form",
  "title": "Survey",
  "config": {
    "fields": [
      { "key": "name",    "label": "Your name",    "type": "string", "required": true },
      { "key": "rating",  "label": "Rating",       "type": "number" },
      { "key": "comment", "label": "Comments",     "type": "string", "widget": "textarea" }
    ],
    "submitHandler": "submitPublicSurvey",
    "mode": "public",
    "successMessage": "Thanks for your feedback!"
  }
}
```

…and in the consumer's `customComponents.js`:

```js
import { generateUrl } from '@nextcloud/router'

export default {
  submitPublicSurvey: async (formData, $route, $router) => {
    const url = generateUrl(`/apps/pipelinq/public/survey/${$route.params.token}`)
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: formData }),
    })
    if (!response.ok) {
      throw new Error('Submit failed')
    }
  },
}
```

The handler receives `$route` + `$router` so it can read URL params and route away on success.

## Manifest example — endpoint mode

```json
{
  "id": "ContactRequest",
  "route": "/contact",
  "type": "form",
  "title": "Get in touch",
  "config": {
    "fields": [
      { "key": "email",   "label": "Email",       "type": "string" },
      { "key": "message", "label": "Your message", "type": "string", "widget": "textarea" }
    ],
    "submitEndpoint": "/api/contact",
    "submitMethod": "POST",
    "successMessage": "We'll be in touch soon."
  }
}
```

The page calls `axios.post('/api/contact', formData)` on submit. Use the `:param` substitution when the URL depends on the route — `submitEndpoint: '/api/customer/:id/feedback'` resolves `:id` from `$route.params.id` automatically.

## Slots

| Slot | Scope | Purpose |
|------|-------|---------|
| `#header` | `{ title, description }` | Override the default `CnPageHeader` |
| `#actions` | none | Right-aligned actions area (the renderer wires `pages[].actionsComponent` here) |
| `#field-<key>` | `{ field, value, onInput, error }` | Replace the default input for a specific field. `error` (manifest-form-logic) is the current validation failure message, or `null` |
| `#submit` | `{ submitting, dirty, submit }` | Replace the submit button entirely (only rendered on the last step of a wizard, or always in a single-step form) |

## Events

| Event | Payload | When |
|-------|---------|------|
| `@input` | `{ key, value }` | A field changed |
| `@step` | `{ from, to }` | Wizard step navigation (Next/Back) — manifest-form-logic |
| `@submit` | the effective payload | Submit succeeded. Hidden-by-condition field keys are removed (see "Conditional fields") |
| `@error` | `error` | Submit failed (the component already displays the error message in the form's error block) |

## Multi-step wizards

`config.steps[]` groups the flat `fields[]` array into ordered wizard steps. Steps hold ordered **key references**, not field objects — `config.fields[]` stays the single source of truth:

```jsonc
{
  "id": "IntakeWizard",
  "route": "/public/intake/:token",
  "type": "form",
  "config": {
    "fields": [
      { "key": "kind", "label": "Kind", "type": "enum", "enum": ["person", "company"] },
      { "key": "name", "label": "Name", "type": "string", "validation": { "required": true } },
      { "key": "kvk",  "label": "KvK",  "type": "string",
        "visibleWhen": { "field": "kind", "op": "eq", "value": "company" },
        "validation": { "required": true, "pattern": "^[0-9]{8}$" } }
    ],
    "steps": [
      { "id": "who",  "title": "Who are you?", "fields": ["kind", "name"] },
      { "id": "kvk",  "title": "Company details", "fields": ["kvk"] }
    ],
    "submitEndpoint": "/api/intake/:token"
  }
}
```

Rules (enforced by `validateManifestV2()` post-schema, since JSON Schema can't express them):

- `steps[].id` must be unique within the page.
- Every `steps[].fields[]` entry must reference a declared `fields[].key`.
- When `steps` is present, **every** declared field key must appear in **exactly one** step — a field in zero steps would silently never render; a field in two steps would double-render.

Rendering: an accessible step indicator (`<nav aria-label="Form steps">` wrapping an `<ol>`, the current step's `<li>` carrying `aria-current="step"`), only the current step's fields, and a Back / Next / Submit footer. Back never validates; Next validates the current step's *visible* fields and blocks on failure; Submit (last step) validates every visible field across every step and, on failure, jumps to the earliest invalid step. A step whose fields are **all** hidden by `visibleWhen` conditions is skipped by Next/Back in both directions.

Absent `steps`, `CnFormPage` renders exactly as it did before this capability existed — one field column, one submit button.

## Conditional fields

`fields[].visibleWhen` reuses the library's shared `visibleWhen` predicate (`{ endpoint? | source? | field, op?, value }`, `op` one of `eq | neq | gt | gte | lt | lte`, default `eq`) — the same shape manifest actions, the banner widget, and `rowClassRules` already use. No new grammar.

- **LOCAL mode** (neither `endpoint` nor `source` set) — `field` dot-paths into the **live form data**, so a condition can reference another field's current value (`{ "field": "kind", "op": "eq", "value": "company" }`). Evaluated **synchronously** on every keystroke, in field **declaration order**: a field hidden by its own condition reads as `undefined` for every LATER field's condition, so hiding one field can cascade and hide another. Author fields in the order they're referenced.
- **`endpoint` / `source` modes** keep their existing async, fail-safe semantics (`GET` a JSON endpoint, or query an OpenRegister `{ register, schema, filter? }` source) — resolved **once at mount** and cached; they do **not** re-evaluate on keystrokes. Any fetch error hides the field (fail-safe), matching the banner widget's documented behaviour. On a public-mode page these fetch with the requester's (anonymous) auth, so prefer LOCAL conditions on public forms unless the endpoint is meant to be publicly readable.

The first dot-segment of a LOCAL `field` must match a declared field key — a typo (`"filed"`/wrong key) fails at `validateManifestV2()` time rather than silently evaluating `undefined` forever.

**Hidden fields are excluded from validation and from the dispatched payload** (their draft value is retained in component state, so toggling the condition back restores what the user typed). This is deliberate: a `required` rule on an invisible field can never soft-lock the form, and the backend never receives a stale, retracted answer.

## Validation

`fields[].validation` is a closed shape: `{ required?, min?, max?, pattern?, message? }` (`additionalProperties: false` — a typo'd rule key fails validation instead of being silently ignored).

| `field.type` | `required` passes when | `min` / `max` bound | `pattern` |
|---|---|---|---|
| `string`, `password` | non-empty after trim | string **length** | tested against the value |
| `number` | value is a finite number | numeric **value** | not applicable |
| `boolean` | value is `true` (consent checkboxes) | not applicable | not applicable |
| `enum` | a value is selected | not applicable | not applicable |
| `json` | value is non-null | not applicable | not applicable |

`message` (i18n-able, resolved through the same `translate` prop as `field.label`) replaces the built-in default message for whichever rule fails. Built-in defaults are English msgids translated via `t('nextcloud-vue', …)`.

Cross-shape rules the JSON Schema can't express are checked post-schema by `validateManifestV2()`: `min <= max` when both are set, `pattern` must compile, and type-inapplicable rules are errors (`pattern` only on `string`/`password`; `min`/`max` only on `string`/`password`/`number`).

Errors render through the pure `validateFieldValue(field, value, translate)` helper (`src/utils/formValidation.js`) on Next / Submit; editing a field clears its error immediately. For `NcTextField`/`NcTextArea`-family widgets the error surfaces via the native `error` + `helperText` props; for widgets without native error support (`boolean`, `enum`, `json`, the native-`<textarea>` fallback, and `#field-<key>` slot overrides) `CnFormPage` renders an adjacent `role="alert"` element wired to the input via `aria-describedby`.

**A caveat**: a `validation.pattern` beginning with a literal `@` (e.g. `"@[a-z]+"`) trips the manifest's sentinel-token guard, which walks every string leaf under `pages[].config`. Regex authors anchor with `^` anyway (`"^@[a-z]+$"` starts with `^`, not `@`), so this is theoretical in practice.

## Field types

The renderer delegates to `cnRenderFormField` from `@conduction/nextcloud-vue/composables`. Supported `field.type` values:

| `field.type` | Widget | Notes |
|--------------|--------|-------|
| `boolean` | `NcCheckboxRadioSwitch` | |
| `number` | `NcTextField` (type=number) | Empty string → `null`; otherwise coerced to `Number` |
| `string` | `NcTextField` | Default. Add `widget: "textarea"` to render a multi-line input |
| `password` | `NcTextField` (type=password) | |
| `enum` | `NcSelect` | Options from `field.enum` (preferred) or `field.options` |
| `json` | `CnJsonViewer` | Read-only display in this revision |

Unknown `field.type` values fall back to `NcTextField` and emit a one-shot `console.warn` so the manifest typo surfaces during development.

## Why `type: "form"` is its own page type

The settings page (`type: "settings"`) is admin-facing config persistence — it assumes `IAppConfig` is the destination and groups fields into sections. Forms have a different audience (end users), a different destination (consumer-defined endpoint or handler), and a flat shape (no sections). Sharing the field renderer keeps the duplication low without wedging end-user form rendering into a settings-shaped component.

For form-builder authoring UIs (drag-drop question ordering, per-field validation panels, branching logic) keep using `type: "custom"` — the manifest's declarative shape doesn't fit a builder UI.
