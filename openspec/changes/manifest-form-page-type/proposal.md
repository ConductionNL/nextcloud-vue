# Manifest form page type

## Why

Pipelinq's forms + surveys areas declare 7 manifest entries that all
fall back to `type: "custom"` because the library has no built-in
page type for "render a manifest-declared field set with a submit
handler":

- `Forms` → `FormManagerView`
- `FormNew` / `FormDetail` → `FormBuilderView`
- `FormSubmissions` → `FormSubmissionsView`
- `SurveyCreate` / `SurveyEdit` → `SurveyFormView`
- `PublicSurvey` → `PublicSurveyFormView`

That's the same fallback every consumer hits when the user-facing
surface is "a stack of fields, a submit button, and an HTTP call" —
the canonical example being the public survey route at
`/public/survey/:token` (already declared in `pipelinq/src/manifest.json`
at lines 359-365).

ADR-024 keeps the `type` enum closed; a "form" page is not "settings"
(no `IAppConfig` keys, no per-app save endpoint convention) and not
"detail" (no register/schema lookup, no embedded sidebar). Without a
dedicated `type: "form"` every consumer with a manifest-declarable
runtime form gets pushed back to `type: "custom"` even though the
shape is regular.

## What Changes

`pages[].type` gains a new value: `"form"`. CnPageRenderer dispatches
to a new `CnFormPage` component that renders an array of fields plus
a submit button. Its `config` shape:

```jsonc
{
  "id": "PublicSurvey",
  "route": "/public/survey/:token",
  "type": "form",
  "title": "Survey",
  "config": {
    "schema": "survey",                 // optional — informational only
    "register": "pipelinq",              //   ditto
    "fields": [
      { "key": "name",    "label": "i18n.name",    "type": "string", "required": true },
      { "key": "rating",  "label": "i18n.rating",  "type": "number" },
      { "key": "comment", "label": "i18n.comment", "type": "string", "widget": "textarea" }
    ],
    "submitHandler": "submitPublicSurvey",   // registry name (event-handler escape hatch)
    "submitEndpoint": "/api/forms/{id}",    // OR an HTTP URL — the page POSTs the form data
    "submitMethod": "POST",                  // POST | PUT | PATCH (default POST)
    "mode": "public",                         // edit | create | public (default public)
    "submitLabel": "i18n.submit",
    "successMessage": "i18n.thank-you"
  }
}
```

Field shapes reuse the existing `formField` `$def` from the
`manifest-config-defs` change — same shape `CnSettingsPage` consumes
for its bare-`fields[]` section flavor. Built-in field renderers
(`boolean`, `number`, `string`, `enum`, `password`, `json`,
`+widget: "textarea"`) match the settings-page set.

Submit dispatch is one of:

1. **Endpoint mode** (`submitEndpoint` set) — `CnFormPage` runs
   `axios[method](endpoint, formData)`. The endpoint MAY contain
   `{:paramName}` segments resolved against `$route.params`.
2. **Handler mode** (`submitHandler` set) — `CnFormPage` resolves
   the name against the customComponents registry and calls the
   exported function with `(formData, $route, $router)`. This is the
   escape hatch when the consumer needs to call a non-trivial JS
   service (e.g. pipelinq's authenticated PublicSurvey POST that
   includes the token from the route).

The page MUST declare exactly one of the two; setting both raises a
validator error.

## Problem

Without `type: "form"` every consumer that ships a manifest-driven
runtime form (public surveys, embedded "request a quote" pages,
ticket-create routes when no detail-page round-trip is needed) writes
a `type: "custom"` entry that:

- Duplicates the same field-renderer logic CnSettingsPage already has.
- Forces the consumer to expose a Vue file in `customComponents`
  and re-register it in `customComponents.js`.
- Bypasses the manifest validator's awareness of the page's shape —
  the schema can't tell what fields the custom component renders, so
  i18n audits and accessibility audits walk past these routes.

This change closes the "runtime form rendering" gap. It does NOT
attempt to close the "form-builder authoring UI" gap — the four
form-builder routes (`FormManager`, `FormBuilder`, `FormSubmissions`,
`SurveyAnalytics`) need bespoke editor UIs (drag-drop question
ordering, per-field validation panels, submission tables) that aren't
representable as a static manifest.

## Proposed Solution

1. New `CnFormPage` component renders manifest-declared fields plus
   a submit button. Field types resolve through the same input-renderer
   map CnSettingsPage uses (refactored into a shared helper to avoid
   drift). Errors surface in a `<p class="cn-form-page__error">` block;
   success surfaces a `successMessage` banner and (optionally) emits
   `@submit` so the consumer can route away.
2. `CnPageRenderer`'s `defaultPageTypes` map gains a `form: ...` entry.
   Schema description on `pages[].type` enumerates the new value.
3. `validateManifest`'s `validateTypeConfig` gains a `'form'` branch:
   `fields[]` MUST be a non-empty array, exactly one of
   `submitHandler | submitEndpoint` MUST be set, `submitMethod` (when
   set) MUST be one of POST | PUT | PATCH, `mode` (when set) MUST be
   one of edit | create | public.
4. The `formField` `$def` is unchanged; this change merely starts
   referencing it from a second site (`pages[].config.fields[]` for
   `type: "form"`).

## Out of scope

- Form-builder authoring UI (drag-drop question ordering, per-field
  validation panel). Those four pipelinq routes (`FormManager`,
  `FormBuilder`, `FormSubmissions`, `SurveyAnalytics`) stay
  `type: "custom"` — see design.md "Why six routes still need
  bespoke UIs" for the full rationale.
- Conditional fields (`showIf` predicates). YAGNI for v1; revisit if
  a real consumer needs it.
- Multi-step wizards. Same — YAGNI; complex enough to deserve its
  own change.
- Server-side rendered first paint. The page is a Vue 2 component
  loaded at runtime; SSR is not on Conduction's roadmap.
- File-upload fields. The `formField` `$def` doesn't model file
  uploads today; adding them is a separate change against the
  shared $def, not against this page type.

## See also

- `nextcloud-vue/openspec/changes/manifest-page-type-extensions/specs/manifest-page-type-extensions/spec.md`
  — parent change that introduced `defaultPageTypes` extension.
- `nextcloud-vue/openspec/changes/manifest-config-defs/specs/manifest-config-defs/spec.md`
  — change that introduced the `formField` `$def`.
- `nextcloud-vue/openspec/changes/manifest-settings-rich-sections/specs/manifest-settings-rich-sections/spec.md`
  — sister change that taught CnSettingsPage to mount widgets +
  registry components inside sections; CnFormPage uses the same
  field-renderer building blocks.
- `pipelinq/src/manifest.json` — the immediate consumer; lines
  324-365 define the survey form routes; lines 408-435 define the
  form-builder routes.
- ADR-024 — fleet-wide app-manifest convention; states that new
  `type` enum values require a library-level openspec change (this
  one).
