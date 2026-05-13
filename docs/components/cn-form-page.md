---
sidebar_position: 14
---

# CnFormPage

A manifest-driven runtime form. Renders a flat `fields[]` array plus a submit button declared in `pages[].config` for `type: "form"` pages. Closes the gap that forces every consumer's runtime-form route (public surveys, "request a quote" pages, ticket-create routes that don't need a detail-page round-trip) onto `type: "custom"`.

Mounted automatically by `CnPageRenderer` when a manifest page declares `type: "form"`. Field rendering is delegated to `cnRenderFormField` from `@conduction/nextcloud-vue/composables` so the same input set `CnSettingsPage` uses (boolean, number, string, password, enum, json) is available without duplication. Submit dispatch picks one of two paths depending on which prop is set:

- `submitEndpoint` — the page calls `axios[method](url, formData)` with `:paramName` segments resolved against `$route.params`.
- `submitHandler` — the page resolves the name in the customComponents registry and calls the resolved value with `(formData, $route, $router)`.

**Wraps**: `CnPageHeader`, `NcButton`, `NcLoadingIcon`, plus the input components the field-renderer dispatches to (`NcCheckboxRadioSwitch`, `NcTextField`, `NcSelect`, `CnJsonViewer`, optionally `NcTextArea`).

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
| `fields` | Array | `[]` | Form fields. Each MUST conform to the `formField` `$def` |
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
| `#field-<key>` | `{ field, value, onInput }` | Replace the default input for a specific field |
| `#submit` | `{ submitting, dirty, submit }` | Replace the submit button entirely |

## Events

| Event | Payload | When |
|-------|---------|------|
| `@input` | `{ key, value }` | A field changed |
| `@submit` | `formData` | Submit succeeded |
| `@error` | `error` | Submit failed (the component already displays the error message in the form's error block) |

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
