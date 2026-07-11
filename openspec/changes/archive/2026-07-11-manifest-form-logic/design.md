# Design: Manifest form logic

## Goal

Give the v2 manifest's `type: "form"` pages declarative conditional
logic, multi-step wizard grouping, and per-field validation — the
rendering + schema substrate that `manifest-form-page-type` deferred
("Conditional fields … YAGNI for v1", "Multi-step wizards … complex
enough to deserve its own change") and that `cn-form-builder` and
OpenBuild's `form-editor-logic` need to author against.

## Schema design

### `config.steps[]` — key references, not inline fields

```jsonc
"steps": [
  { "id": "who",  "title": "i18n.step-who",  "fields": ["kind", "name", "kvk"] },
  { "id": "what", "title": "i18n.step-what", "description": "i18n.step-what-desc",
    "fields": ["amount", "motivation"] }
]
```

**Decision: steps reference field keys; they do not embed field
objects.** Alternatives considered:

| Option | Verdict |
|---|---|
| `steps[].fields[]` = full field objects, `config.fields[]` dropped when stepped | Rejected — two shapes for the same data; every consumer of `config.fields[]` (validator's `validateFieldsArray`, CnWidgetFormRenderer forwarding, OpenBuild's editor) would need a union walk; migration between stepped and flat is a rewrite. |
| `fields[].step: "who"` back-references on the field | Rejected — step ORDER would live nowhere (object key order is not contract), and a step's `title`/`description` needs a home anyway. |
| **`steps[].fields[]` = ordered key strings into `config.fields[]`** | **Chosen** — `config.fields[]` stays the single source of truth (flat `formData`, unchanged validator base, unchanged prop surface); steps are a pure presentation grouping. Adding/removing `steps` never touches field definitions. |

Backward compatibility: `steps` absent ⇒ CnFormPage renders exactly
what it renders today (single column, one submit button, no
indicator). No existing manifest changes meaning.

Cross-shape rules (enforced by `validateManifestV2()` post-schema —
see "Validator strategy" below):

- `steps[].id` unique within the page.
- Every entry in `steps[].fields[]` MUST match a declared
  `config.fields[].key`.
- When `steps` is present, every declared field key MUST appear in
  exactly one step (a field in zero steps would silently never
  render; a field in two steps would double-render). Complete
  partition or validation error.
- `steps` requires ≥ 1 entry and each step ≥ 1 field key.

### `fields[].visibleWhen` — reuse `$defs.visibleWhen`, no new grammar

The v2 schema already owns a shared visibility predicate,
`$defs.visibleWhen` (`{ endpoint?, source?, field?, op?, value }`,
`op ∈ eq|neq|gt|gte|lt|lte` default `eq`), `$ref`'d from
`$defs.action.visibleWhen` and mirrored by the banner widget and
`rowClassRules.when`. This change adds one more `$ref` callsite —
`config.fields[].visibleWhen` — and **defines nothing new**.

**How field refs resolve.** The runtime evaluator
(`src/utils/visibleWhen.js`) has three modes, first match wins:

1. `endpoint` set — GET a same-origin JSON endpoint, `field`
   dot-paths into the body.
2. `source` set — OpenRegister `{ register, schema, filter? }` query,
   `field` dot-paths into the first result (or `@total`).
3. **LOCAL** (neither set) — `field` dot-paths into the caller's
   object context.

For form fields, the LOCAL-mode object context **is the live
`formData` object** (keyed by field key). So
`{ "field": "kind", "op": "eq", "value": "company" }` means "visible
while the `kind` field's current value equals `company`". Dot-paths
work for `json`-typed fields (`{ "field": "address.country", … }`).
The first dot-segment of a LOCAL `field` MUST be a declared field key
— enforced by the post-schema validator so a typo (`"filed": "knd"`)
fails at validate time instead of silently evaluating `undefined`.

`endpoint` / `source` conditions keep their existing data-source
semantics and their existing implementation: evaluated **once at
mount** via the async, fail-safe `evaluateVisibleWhen()` (any error →
hidden — same rule the banner widget documents), with the boolean
cached per field for the life of the page. They do NOT re-evaluate on
keystrokes.

LOCAL conditions are evaluated **synchronously** on every formData
change, composed from the pure helpers `visibleWhen.js` already
exports (`readVisibleWhenPath` + `compareVisibleWhen`) — no fetch, no
promise, no flicker. A new `evaluateVisibleWhenLocal(cond, data)`
export wraps the pair (and returns `true` for nullish conditions,
`false` for malformed ones, mirroring the async fail-safe posture).

**Chained conditions.** Field B may gate on field A while A itself
gates on something else. Rule: **conditions evaluate against the
effective (visibility-filtered) form data, computed in a single pass
in field declaration order.** A hidden field's value reads as
`undefined` for every LATER field's condition — so hiding A cascades
to hide a B that requires `A eq x`. Fields must be declared before
fields that reference them (natural authoring order); a condition
referencing a later-declared field sees that field's raw value (no
fix-point iteration — single pass keeps evaluation O(n),
deterministic, and loop-free by construction). This rule is
spec-fixed and documented so OpenBuild's editor can lint ordering.

**Why not `fieldCondition.js`?** CnFormDialog's per-field `condition`
grammar (`equals` / `notEquals` / `in` / `notIn` / `truthy` /
`falsy`) predates the shared predicate and lives on for the dialogs.
The manifest surface standardises on `visibleWhen` because (a) the
task of this change is manifest-declared logic and the manifest
already speaks `visibleWhen` in three places, (b) it covers data-source
conditions the dialog grammar can't, and (c) OpenBuild authors one
grammar, not two. The dialogs' grammar is untouched (out of scope).

### `fields[].validation`

New `$defs.fieldValidation`, `$ref`'d from `config.fields[].validation`:

```jsonc
"validation": {
  "required": true,          // boolean, default false
  "min": 2,                  // number
  "max": 120,                // number
  "pattern": "^[0-9]{8}$",   // ECMAScript regex source (implicit full-value test)
  "message": "i18n.kvk-invalid" // single override for any rule failure
}
```

`additionalProperties: false` — a typo'd rule key fails validation
instead of being silently ignored (the editor depends on this).

Per-type semantics (enforced at runtime, cross-checked by the
post-schema validator):

| field.type | `required` passes when | `min` / `max` apply to | `pattern` |
|---|---|---|---|
| `string`, `password` | non-empty after trim | string length | tested against the value |
| `number` | value is a finite number | numeric value | — (validator error if set) |
| `boolean` | value is `true` (consent checkboxes) | — (validator error) | — (validator error) |
| `enum` | a value is selected | — (validator error) | — (validator error) |
| `json` | value is non-null | — (validator error) | — (validator error) |

`message` (i18n-able, run through the page's `translate` prop like
`field.label`) replaces the built-in default message for whichever
rule fails. Built-in defaults are translated via
`t('nextcloud-vue', …)` ("This field is required", "Must be at least
{min} characters", "Must be at most {max}", "Must be between {min}
and {max}", "Invalid format") — English msgids per the i18n-keys
convention.

Post-schema cross-checks: `min <= max` when both set; `pattern`
MUST compile (`new RegExp(pattern)` in try/catch); type-inapplicable
rules (see table) are errors.

Runtime helper: `src/utils/formValidation.js` exporting
`validateFieldValue(field, value, t) → string|null` (null = valid).
Pure and side-effect free so OpenBuild's editor preview and the Jest
suite exercise it directly.

### Sentinel guard + enum invariants (MUST NOT break)

- `pages[].config` carries `allOf: [{ $ref: "#/$defs/sentinelGuardedValue" }]`
  — a recursive if/then/else walk that fails any out-of-vocabulary
  `@`-prefixed string leaf anywhere under config. The new `steps` /
  `visibleWhen` / `validation` subtrees are ordinary object/array
  values, so the recursion covers them with zero changes; the
  regression suite (`sentinel-token-vocabulary.spec.js` + a new case)
  proves it still fires THROUGH the new shapes (e.g. an
  `@bogus.token` as a `visibleWhen.value`).
- One documented consequence: a `validation.pattern` beginning with a
  literal `@` (e.g. `"@[a-z]+"`) would trip the sentinel leaf guard.
  Regex authors anchor (`^@…` starts with `^`, not `@`), so this is
  theoretical; `docs/components/cn-form-page.md` notes it.
- The `pages[].type` enum stays the closed 14-value list. No new
  page type, no enum edits.
- Schema `version`: 2.18.0 → **2.19.0** (sequential minor, same
  policy `manifest-public-mode` stated; renumber if another change
  lands 2.19.0 first).

### Compiled validator

`validateManifestV2()` validates against
`src/utils/validateManifestV2.compiled.js` — a standalone Ajv module
pre-compiled by `scripts/build-validators.js` because Nextcloud's CSP
blocks Ajv's runtime `new Function()` (ADR-036). **Every edit to
`app-manifest-v2.schema.json` is invisible at runtime until
`npm run build:validators` regenerates the compiled module.** The
tasks make the recompile an explicit step and the verification phase
re-runs it to assert the committed output is in sync (idempotent
regeneration, no diff).

## Validator strategy — v2 post-schema block, not `validateTypeConfig`

The v1 path runs `validateTypeConfig()` (which owns the existing
`case 'form':` xor-dispatch checks), but **`validateManifestV2()`
never calls it** — v2 semantic rules live as numbered post-schema
checks inside `validateManifestV2()` (id uniqueness, grid arithmetic,
sentinel rejection, dashboard slot wiring, …). The form-logic
cross-shape rules therefore land as a new post-schema check block
(`// 7. Form logic (manifest-form-logic)`), iterating
`clone.pages` where `page.type === 'form'`, pushing errors in the
established `/pages/{i}/config/steps/{j}: …` shape. The v1 `form`
branch is untouched — v1 manifests declaring `steps` were never valid
v1 and stay that way.

## Rendering — CnFormPage

### New prop

| Prop | Type | Default | Notes |
|---|---|---|---|
| `steps` | `Array<{id, title, description?, fields: string[]}>` | `[]` | Empty = single-step (today's rendering, unchanged). CnPageRenderer already forwards the whole normalized `config` to the page component, so `config.steps` arrives with no renderer change; `CnWidgetFormRenderer` builds `innerProps` from an explicit prop list and MUST add `steps`. |

Internal state additions: `currentStepIndex`, `fieldErrors`
(`{ [key]: string }`), `remoteVisibility` (`{ [key]: boolean }` cache
for endpoint/source conditions).

### Step chrome

- Step indicator: an `<ol class="cn-form-page__steps">` of step
  titles — rendered only when `steps.length > 0`. The current step's
  `<li>` carries `aria-current="step"`; completed steps get a check
  mark; the list sits in a `<nav :aria-label="t('Form steps')">`.
  NC theming via CSS variables only (`--color-primary-element`,
  `--color-text-maxcontrast`) — nldesign compatible.
- Body renders ONLY the current step's fields (in the step's
  `fields[]` order), each still filtered by visibility and still
  overridable via the existing `#field-<key>` slots.
- Footer: Back (`NcButton` secondary, hidden on the first step),
  Next (primary, steps 1..n-1), Submit (primary, last step only —
  the existing submit button + `#submit` slot, unchanged).
- Buttons stay enabled; a failing Next/Submit runs validation, paints
  the errors, and moves focus to the first invalid field (disabled
  buttons hide the "why" from screen-reader users).
- A step whose fields are ALL hidden by conditions is skipped by
  Next/Back in both directions (covers conditional sections without
  branching flows).
- New events: `@step` `{ from, to }` on navigation; existing
  `@submit` / `@error` / `@input` unchanged.

### Validation gating

- **Next**: validates the current step's *visible* fields via
  `validateFieldValue`; any failure blocks navigation, fills
  `fieldErrors`, focuses the first invalid input.
- **Back**: never validates (users may retreat with invalid input).
- **Submit** (last step / single-step): validates ALL visible fields
  across ALL steps; on failure jumps to the earliest step containing
  an invalid field. Only then does the existing dispatch
  (endpoint/handler) run — unchanged from `manifest-form-page-type`.
- Errors clear per-field as the user edits that field.

### Error surfacing — NC-standard, accessible

`cnRenderFormField` gains an optional `error` argument
(`{ field, value, onInput, t, error }`); when set, the returned
bindings include the NC-standard error props on components that
support them (`NcTextField` / `NcTextArea` / NcInputField family:
`error: true`, `helperText: <message>`) — the input paints the
error state and announces the message natively. For widgets without
native error props (boolean switch, `NcSelect`, `CnJsonViewer`,
native-textarea fallback, `#field-<key>` slot overrides), CnFormPage
renders an adjacent
`<p class="cn-form-page__field-error" role="alert" :id="…">` wired to
the input wrapper via `aria-describedby`, colored
`var(--color-error)`. Slot consumers receive `error` in the scoped
props so custom inputs can surface it themselves.

### Hidden-field exclusion — the decision

**Hidden-by-condition fields are excluded from validation AND from
the submit payload; their draft values are retained in component
state.**

- *Excluded from validation* — a `required` field the user cannot see
  is un-fillable; validating it soft-locks the form.
- *Excluded from the payload* — the payload must equal what the user
  saw and confirmed. Leaking a stale draft (`kvk` typed, then `kind`
  flipped back to `person`) sends contradictory data the backend has
  no reason to expect, and in public mode it leaks input the user
  believes they retracted. Consumers' backends thus validate the same
  effective shape the user submitted.
- *Retained in state* — toggling a condition off and on restores the
  draft instead of destroying work. State is in-memory only; nothing
  persists.
- The same effective-payload view feeds chained condition evaluation
  (see "Chained conditions"), so "excluded from payload" and "reads
  as undefined downstream" are one rule, not two.

### Public mode (`manifest-public-mode` interplay)

All logic in this change is client-side (steps, LOCAL conditions,
validation), so `mode: "public"` needs no special-casing: the wizard
renders on token-scoped unauthenticated routes exactly as
authenticated ones. Two notes: (a) `endpoint` / `source` conditions
on a public page fetch with the requester's (anonymous) auth — the
existing fail-safe hides the field if the fetch 401s, which is the
correct conservative default and gets a docs callout; (b) the
public-mode success banner + form-hide behaviour fires only after the
final step's successful dispatch, as today.

## Testing strategy

The repo's unit runner is **Jest** (`npm test`; the request said
vitest but HEAD's `package.json` wires `"test": "jest"` — tests land
in the existing Jest suite and conventions). The repo also has its
**own Playwright setup** (`playwright.config.js`, `testDir: './e2e'`,
`testMatch: '**/*.e2e.js'`, Vite harness under `e2e/harness/`), so UI
scenarios get real e2e coverage here instead of the
"covered by consumer app e2e" exclusion:

- **Schema/validator (Jest)** — `tests/schemas/app-manifest-v2.schema.spec.js`:
  steps/visibleWhen/validation accept + reject cases, cross-shape
  post-schema errors, sentinel-guard-through-new-shapes, fleet
  regression stays green (`fleet-manifest-regression.spec.js`,
  additive change ⇒ zero fixture edits required to pass).
- **Helpers (Jest)** — `tests/utils/formValidation.spec.js`,
  `evaluateVisibleWhenLocal` cases in `tests/components/visibleWhen.spec.js`'s
  home suite: per-type rules, chained/cascade evaluation, declaration-order
  single-pass semantics.
- **Component (Jest)** — extend `tests/components/CnFormPage.spec.js`:
  step navigation, gating, payload exclusion, error rendering, slot
  scope additions, single-step regression (existing cases untouched).
- **e2e (Playwright)** — new `e2e/form-logic.e2e.js` behind a
  `?fl=1` harness view (same pattern as `form-dialog.e2e.js`'s
  `?fd=1`): a 2-step wizard with one conditional field — walk
  forward/back, trigger a validation error, flip the condition,
  submit, assert the payload excludes the hidden field.

Target: ~25 new Jest cases + 4-5 e2e cases; zero regressions on the
existing suites.

## Risks

| Risk | Mitigation |
|---|---|
| Compiled validator forgotten after schema edit → schema change invisible at runtime | Explicit `npm run build:validators` task + verification task asserting regeneration produces no diff. |
| Chained-condition ordering surprises (condition references a later field) | Spec-fixed single-pass declaration-order rule; documented; OpenBuild's editor can lint it. `validateManifestV2` verifies key existence, not ordering (a forward ref is legal, just late-binding). |
| `NcTextArea` availability varies across `@nextcloud/vue` versions (existing fallback to native `<textarea>`) | Error surface degrades to the adjacent `role="alert"` paragraph on the native fallback — already the plan for non-NcInputField widgets. |
| Two condition grammars in the lib (dialog `fieldCondition` vs manifest `visibleWhen`) | Deliberate + documented (see "Why not fieldCondition.js"); dialog migration is out of scope with its own compat story. |
| `steps` partition rule too strict for generated manifests (field added, step forgotten) | The error message names the unassigned key(s) verbatim; OpenBuild's editor auto-assigns new fields to the last step. Strictness is the point — an unassigned field silently never renders. |
| Remote (`endpoint`/`source`) conditions on public pages fetch anonymously | Fail-safe hidden (existing behaviour); docs callout tells authors to prefer LOCAL conditions on public forms. |

## Adoption path

1. Lib ships schema 2.19.0 + CnFormPage logic (this change).
2. OpenBuild's `form-editor-logic` change adds visual condition /
   validation / step editors writing these exact shapes.
3. Pipelinq's survey routes and decidesk's request forms adopt
   `steps` + `visibleWhen` from the manifest, staying declarative.
4. `cn-form-builder` lifts its deferred non-goals (validation rule
   editor, conditional visibility) against the now-existing substrate.
5. Dialog-grammar convergence (`fieldCondition.js` → `visibleWhen`)
   is evaluated as a separate change once consumers stop authoring
   the legacy shape.
