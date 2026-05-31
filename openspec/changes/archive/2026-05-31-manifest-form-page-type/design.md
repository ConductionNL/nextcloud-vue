# Design: Manifest form page type

## Goal

Close the "runtime form rendering" gap in the manifest renderer.
Today every consumer with a manifest-declarable runtime form (public
surveys, "request a quote" pages, ticket-create routes) falls back
to `type: "custom"` because the lib has no built-in form page type.

After this change consumers declare:

```json
{
  "id": "PublicSurvey",
  "route": "/public/survey/:token",
  "type": "form",
  "title": "Survey",
  "config": {
    "fields": [...],
    "submitHandler": "submitPublicSurvey",
    "mode": "public"
  }
}
```

…and the library renders the fields, binds submit, dispatches the
data through one of two well-defined exits (HTTP endpoint or
registered JS handler).

## Component contract — CnFormPage

### Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `fields` | `Array<formField>` | yes | Same `formField` $def CnSettingsPage consumes |
| `submitHandler` | `String` (registry name) | one-of | Resolves against `cnCustomComponents` |
| `submitEndpoint` | `String` (URL) | one-of | `axios[method](url, data)`; supports `:param` substitution from `$route.params` |
| `submitMethod` | `'POST' \| 'PUT' \| 'PATCH'` | no | Default `POST` |
| `mode` | `'edit' \| 'create' \| 'public'` | no | Default `public` — controls form chrome (e.g. hides "Cancel" link in public mode) |
| `submitLabel` | `String` (i18n key) | no | Default `'Submit'` |
| `successMessage` | `String` (i18n key) | no | Default `'Thank you!'` |
| `initialValue` | `Object` | no | Pre-filled form state — used by `mode: "edit"` |
| `title` | `String` | no | Forwarded to CnPageHeader |
| `description` | `String` | no | Forwarded to CnPageHeader |

`submitHandler` and `submitEndpoint` are mutually exclusive at the
validator level. The component itself is loose (works if both are
set, prefers `submitEndpoint`) so a stale manifest doesn't crash.

### Events

| Event | Payload | When |
|---|---|---|
| `@submit` | `formData` | Submit succeeded; consumer may route away |
| `@error` | `error` | Submit failed; component already shows the error in-page |
| `@input` | `{ key, value }` | Any field changed |

### Slots

Identical pattern to CnSettingsPage:

| Slot | Scope | Purpose |
|---|---|---|
| `#header` | `{ title, description }` | Override CnPageHeader |
| `#actions` | none | Right-aligned actions area (renderer wires `pages[].actionsComponent`) |
| `#field-<key>` | `{ field, value, onInput }` | Replace the input for a specific field |
| `#submit` | `{ submitting, dirty, submit }` | Replace the submit button entirely |

### Field-renderer building blocks

The settings page's bare-`fields[]` body uses an inline `<NcCheckboxRadioSwitch | NcTextField | ...>` switch. To avoid drift between settings + form rendering, this change extracts that switch into a small `cnFormFieldRenderer.js` helper exported from
`src/composables/cnFormFieldRenderer.js`. CnSettingsPage's bare-fields branch is **NOT** rewritten in this change — it keeps its inline switch — but CnFormPage uses the helper. A follow-up change can DRY the settings page once the helper has settled.

Built-in widget hints supported by the helper:

| `field.type` | Widget | When `field.widget` overrides |
|---|---|---|
| `boolean` | `NcCheckboxRadioSwitch` | — |
| `number` | `NcTextField type=number` | — |
| `password` | `NcTextField type=password` | — |
| `enum` | `NcSelect` | — |
| `json` | `CnJsonViewer` (read-only display until edit support lands) | — |
| `string` | `NcTextField` | `widget: "textarea"` → `<NcTextArea>` |

Anything outside this set falls back to `NcTextField` and emits a
`console.warn` so consumers notice the typo.

## Submit dispatch

### Endpoint mode

```js
const url = resolveParams(submitEndpoint, $route.params)
const response = await axios[submitMethod.toLowerCase()](url, formData)
```

`resolveParams` is a tiny helper that replaces `:name` segments with
`$route.params[name]`. Lifted from the existing
`resolveRouteParams.js` util pattern used elsewhere in the lib.

### Handler mode

```js
const handler = cnCustomComponents[submitHandler]
if (typeof handler !== 'function') {
  console.warn(`[CnFormPage] handler "${submitHandler}" not found in customComponents`)
  return
}
await handler(formData, $route, $router)
```

The handler receives the route + router so it can post to a
parameterised endpoint (e.g. pipelinq's `/apps/pipelinq/public/survey/${token}`)
and route away on success.

## Why six routes still need bespoke UIs

This change targets **runtime form rendering**, not **form authoring**.
Pipelinq's seven `type: "custom"` form-and-survey routes split:

| Route | Component | After this change |
|---|---|---|
| `Forms` | `FormManagerView` | stays `custom` — index of forms with status, response counts, edit/delete actions; covered by `type: "index"` ONCE the form domain is migrated to a register/schema, but until then the bespoke UI shows fixture-driven cards |
| `FormNew` / `FormDetail` | `FormBuilderView` | stays `custom` — the form *builder* (drag-drop question ordering, per-field validation panel, branching logic editor). Manifest can't represent "user constructs a manifest" |
| `FormSubmissions` | `FormSubmissionsView` | stays `custom` — submission table with response detail panes; eventually `type: "index"` against a `formSubmission` schema, but the per-row "view answers" UX is bespoke |
| `SurveyCreate` / `SurveyEdit` | `SurveyFormView` | stays `custom` for the same reason as FormBuilder — the survey *editor* is itself a form builder |
| `SurveyAnalytics` | `SurveyAnalyticsView` | stays `custom` — charts + cross-tabs; eventually `type: "dashboard"` once the chart widgets accept analytics queries |
| `PublicSurvey` | `PublicSurveyFormView` | **MIGRATES** to `type: "form"` — this is exactly the runtime-form gap the change closes |

So one of seven migrates today; six stay `custom`. The six are not
"the manifest can't ever represent them" — they're "the manifest's
declarative shape doesn't fit a builder UI." Form-builder authoring
is the kind of bespoke UI ADR-024 deliberately leaves to
`type: "custom"`.

## Why a separate page type, not a settings-page extension

CnSettingsPage's contract is admin-facing config persistence:

- It assumes the consumer's `IAppConfig` is the destination.
- Its default save endpoint is `/index.php/apps/{appId}/api/settings`.
- It groups fields into sections — overkill for a single submit-form.
- Its widget escape hatch (`widgets[].type`) is sized for "drop a
  CnVersionInfoCard into a section," not "render a survey question."

Forms have a different audience (end users), a different destination
(consumer-defined endpoint or handler), and a flat shape (no
sections). Wedging them into CnSettingsPage would force every
settings consumer to step around a `mode: "form"` flag.

The shared field-renderer helper means we don't pay for the
duplication twice.

## Schema impact

The `formField` `$def` introduced by `manifest-config-defs` is
unchanged. This change adds two `$ref` callsites:

- `pages[].config.fields[]` for `type: "form"` (NEW).
- `pages[].config.sections[].fields[]` for `type: "settings"` (existing).

The `pages[].type` description string is extended to enumerate
`form` alongside the existing types. No top-level schema version bump
because `type` is documented as a "string the renderer dispatches by
key" — there's no enum constraint to tighten.

## Testing strategy

- **Validator tests** (`tests/schemas/app-manifest.schema.spec.js`):
  bare-form-valid, missing-fields-rejected, both-handler-and-endpoint-rejected,
  bad-method-rejected, bad-mode-rejected.
- **Renderer dispatch tests** (`tests/components/CnPageRenderer.spec.js`):
  add a `type: "form"` entry to the sample manifest and assert that
  CnPageRenderer mounts CnFormPage.
- **Component tests** (`tests/components/CnFormPage.spec.js`):
  field rendering by type, submit-via-handler dispatch, submit-via-endpoint
  dispatch, error display, success message, slot overrides
  (`#header`, `#field-<key>`, `#submit`).

Target: 8-10 new test cases. No regression on the existing 524
suites.

## Risk

| Risk | Mitigation |
|---|---|
| `customComponents` registry holds Vue components, not functions | Detect `typeof handler !== 'function'`; warn + bail. The registry is already a free-form `Record<string, any>` (see CnPageRenderer's resolution logic) so this is a soft constraint at the consumer level. |
| `axios` import bloats the bundle for consumers who only use handler-mode | `axios` is already a dependency through `@nextcloud/axios`; no new dep. |
| Field renderer drift between CnSettingsPage and CnFormPage | The shared helper covers it; the settings page MUST be migrated to the helper in a follow-up so the inline switch isn't a permanent shadow. |

## Adoption path

1. Lib ships `type: "form"` (this change).
2. Pipelinq migrates `PublicSurvey` (the test consumer) — see consumer PR.
3. Other apps with public-form routes (decidesk's request-form, larping app's character-create, …) migrate as they hit the gap.
4. Form-builder authoring UI is a separate, larger change against
   `type: "custom"` — possibly with its own page type
   (`type: "form-builder"`) once the shape settles. Not in scope here.
