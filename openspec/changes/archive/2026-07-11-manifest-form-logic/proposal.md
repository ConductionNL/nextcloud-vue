# Manifest form logic — conditional fields, multi-step wizards, validation rules

## Why

`manifest-form-page-type` shipped `type: "form"` with two explicit
YAGNI deferrals in its proposal's "Out of scope" section:

> - Conditional fields (`showIf` predicates). YAGNI for v1; revisit if
>   a real consumer needs it.
> - Multi-step wizards. Same — YAGNI; complex enough to deserve its
>   own change.

Real consumers have now hit both. Pipelinq's survey routes need
answer-dependent follow-up questions; decidesk's request forms need
"only ask for a motivation when the amount exceeds X"; and every
public intake form longer than ~8 fields reads better as a stepped
wizard than as one scrolling column. On top of that, `CnFormPage`
today has **no client-side validation at all** — `field.required`
exists in the `formField` vocabulary but nothing enforces it, so a
public-mode user only learns about a missing mandatory field from the
backend's 400 response.

The sister change `cn-form-builder` (the visual form composer) hit
the same wall from the authoring side and explicitly deferred the
whole area in its "Non-goals (this PR)" list:

> - Per-field validation rule editor (regex / min / max).
> - Conditional visibility (`showIf`).

That deferral was correct: an authoring UI can't compose rules the
schema can't express and the renderer can't execute. This change is
the missing substrate — the **rendering + schema leaf**. OpenBuild's
`form-editor-logic` change consumes it for authoring (visual condition
/ validation editors that write the shapes this change defines), and
`CnFormBuilder` can lift its two deferred non-goals once this lands.

## What Changes

The v2 manifest schema's `type: "form"` page config gains three
additive shapes:

```jsonc
{
  "id": "IntakeWizard",
  "route": "/public/intake/:token",
  "type": "form",
  "config": {
    "mode": "public",                          // manifest-public-mode interplay
    "fields": [
      { "key": "kind",   "label": "i18n.kind",   "type": "enum", "enum": ["person", "company"] },
      { "key": "name",   "label": "i18n.name",   "type": "string",
        "validation": { "required": true, "min": 2, "max": 120 } },
      { "key": "kvk",    "label": "i18n.kvk",    "type": "string",
        "visibleWhen": { "field": "kind", "op": "eq", "value": "company" },
        "validation": { "required": true, "pattern": "^[0-9]{8}$", "message": "i18n.kvk-invalid" } },
      { "key": "amount", "label": "i18n.amount", "type": "number",
        "validation": { "min": 0, "max": 100000 } },
      { "key": "motivation", "label": "i18n.motivation", "type": "string", "widget": "textarea",
        "visibleWhen": { "field": "amount", "op": "gt", "value": 5000 },
        "validation": { "required": true, "message": "i18n.motivation-required" } }
    ],
    "steps": [
      { "id": "who",  "title": "i18n.step-who",  "fields": ["kind", "name", "kvk"] },
      { "id": "what", "title": "i18n.step-what", "description": "i18n.step-what-desc",
        "fields": ["amount", "motivation"] }
    ],
    "submitEndpoint": "/api/intake/:token"
  }
}
```

1. **`config.steps[]`** — ordered `{ id, title, description?, fields[] }`
   groups, where `fields[]` lists field **keys** declared in
   `config.fields[]` (single source of truth; no field duplication).
   Absent `steps` = single-step form, byte-for-byte the existing
   behaviour — fully backward compatible.
2. **`config.fields[].visibleWhen`** — REUSES the existing
   `$defs.visibleWhen` predicate (`{ endpoint? | source? | field, op?,
   value }`) already shared by manifest actions, the banner widget,
   and `rowClassRules`. **No new condition grammar.** The LOCAL mode
   (neither `endpoint` nor `source`) resolves `field` as a dot-path
   into the **live form data**, so conditions can reference other form
   field values; `endpoint` / `source` modes keep their existing
   data-source semantics (evaluated once at mount, fail-safe hidden).
3. **`config.fields[].validation`** — `{ required?, min?, max?,
   pattern?, message? }` per field, enforced client-side by
   `CnFormPage` before dispatch.

Rendering: `CnFormPage` renders a step indicator plus Next / Back
navigation with per-step validation gating; hidden-by-condition fields
are excluded from validation **and** from the submit payload (their
draft values are retained in component state so toggling a condition
back restores the user's input); validation errors render through the
NC-standard input error surface (`NcInputField` `error` +
`helperText` props via `cnRenderFormField`, `role="alert"` fallback
for widgets without native error props). Everything works in
`mode: "public"` — step state and validation are purely client-side,
so token-scoped unauthenticated forms (see `manifest-public-mode`)
get the full wizard experience.

Schema changes are **additive only**: the closed 14-value page-type
enum is untouched, the `sentinelGuardedValue` recursion over
`pages[].config` stays intact (the new keys flow through it
unchanged), and the schema `version` bumps one sequential minor
(2.18.0 → 2.19.0). Because the v2 validator is **pre-compiled**
(`src/utils/validateManifestV2.compiled.js`, generated by
`scripts/build-validators.js` for CSP reasons — ADR-036), every
schema edit MUST be followed by `npm run build:validators`; the tasks
include that recompile step. Cross-shape rules the JSON Schema cannot
express (step/field key references, `min <= max`, `pattern`
compilability) land as post-schema checks in `validateManifestV2()` —
the v1 `validateTypeConfig` path is not used by v2 and is left
untouched.

## Problem

Without this change:

- Conditional questions force the whole page back to
  `type: "custom"` — exactly the fallback `manifest-form-page-type`
  was written to eliminate. One `visibleWhen` on one field costs the
  consumer the entire declarative surface.
- Long public forms are a single unbroken column; there is no
  declarative way to group fields into steps, so consumers either
  ship poor UX or fork the component.
- `field.required` is decorative: nothing on the client enforces it,
  no `min`/`max`/`pattern` constraints exist at all, and errors only
  surface after a round-trip — unacceptable for public-mode forms
  where the backend error shape isn't localisable.
- OpenBuild's form editor (`form-editor-logic`) has nothing to
  author against: the authoring UI needs a schema-defined,
  renderer-executed rule vocabulary before it can expose condition /
  validation editors.

## Proposed Solution

1. **Schema** (`src/schemas/app-manifest-v2.schema.json`): type
   `config.steps[]` and tighten `config.fields[]` items with
   `visibleWhen` (`$ref: "#/$defs/visibleWhen"`) and a new
   `$defs.fieldValidation` shape. Bump `version` to 2.19.0. Run
   `npm run build:validators` to regenerate the compiled validator.
2. **Validator** (`src/utils/validateManifest.js`,
   `validateManifestV2()` post-schema block): step id uniqueness,
   step→field key reference integrity, full step coverage of declared
   fields, `min <= max`, `pattern` compiles, LOCAL-mode `visibleWhen`
   field refs resolve to a declared field key.
3. **Runtime helpers**: a sync LOCAL-mode visibility evaluator built
   from the already-exported `readVisibleWhenPath` /
   `compareVisibleWhen` primitives in `src/utils/visibleWhen.js`, and
   a new `src/utils/formValidation.js` (`validateFieldValue(field,
   value) → message|null`).
4. **Rendering** (`src/components/CnFormPage/CnFormPage.vue`): `steps`
   prop, accessible step indicator, Next/Back with per-step gating,
   visibility-filtered rendering + payload, error surfacing through
   `cnRenderFormField` (`error` / `helperText` bindings).
   `CnWidgetFormRenderer` forwards the new `steps` prop.
5. **Tests + docs**: unit tests in the repo's existing Jest suite
   (step navigation, condition evaluation incl. chained conditions,
   validation gating, payload exclusion), Playwright e2e in the
   repo's own `e2e/` harness (the lib DOES have its own Playwright
   setup — `playwright.config.js` + `e2e/*.e2e.js`), fixture updates,
   `docs/components/cn-form-page.md` extension.

## Out of scope

- **Authoring UIs.** Visual condition / validation editors belong to
  OpenBuild's `form-editor-logic` change (the consumer of this leaf)
  and to a follow-up on `cn-form-builder` once its deferred non-goals
  unblock. This change only defines what those editors write and how
  it renders.
- **Cross-field validation** (`fieldA < fieldB`, sum constraints).
  The `validation` shape is deliberately per-field; cross-field rules
  need a different grammar and a real consumer first.
- **Async / server-side validation hooks** (uniqueness checks,
  remote lookups). Backend 4xx handling stays as today.
- **Branching step flows** (condition-dependent step ORDER). Steps
  are a fixed ordered list; a step whose fields are all hidden is
  skipped, which covers the common cases without a flow graph.
- **v1 schema back-port.** `steps` / `visibleWhen` / `validation` are
  v2-only; the v1 `form` branch of `validateTypeConfig` is untouched.
- **CnFormDialog / CnAdvancedFormDialog.** The dialogs keep their
  existing `fieldCondition.js` grammar (`equals` / `in` / `truthy`);
  converging the dialogs onto the shared `visibleWhen` grammar is a
  separate migration with its own compat story.

## See also

- `nextcloud-vue/openspec/changes/manifest-form-page-type/` — the
  parent change this one extends; its proposal deferred conditional
  fields + multi-step wizards to "its own change" (this one).
- `nextcloud-vue/openspec/changes/cn-form-builder/proposal.md` — the
  visual form composer that explicitly deferred conditional
  visibility (`showIf`) and the per-field validation rule editor to
  its non-goals; this change supplies the schema + rendering
  substrate those editors need.
- `nextcloud-vue/openspec/changes/manifest-public-mode/` — public
  rendering interplay; `mode: "public"` forms MUST get the full
  wizard + validation behaviour (all logic is client-side).
- `openbuild` `form-editor-logic` change — the authoring-side
  consumer of this leaf.
- `src/utils/visibleWhen.js` — the shared predicate evaluator whose
  grammar (`{ endpoint? | source? | field, op?, value }`) this change
  reuses verbatim.
- ADR-036 — CSP-safe pre-compiled Ajv validator; the reason schema
  edits require the `npm run build:validators` regeneration step.
