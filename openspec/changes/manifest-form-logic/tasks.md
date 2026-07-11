# Tasks: Manifest form logic

> Verify every claim against HEAD before editing — file paths, prop
> names, and helper exports below were read from the current tree but
> other changes may land first. Note: the unit runner is **Jest**
> (`npm test`), and the repo has its OWN Playwright setup
> (`playwright.config.js` + `e2e/*.e2e.js`) — e2e tasks run here, not
> in a consumer app.

## Phase 1 — Schema (REQ-MFL-1..3)

- [ ] Update `src/schemas/app-manifest-v2.schema.json`:
      add `steps` to `$defs.page.properties.config.properties` —
      array, `minItems: 1`, items `{id (string, minLength 1, required),
      title (string, minLength 1, required), description (string,
      optional), fields (array of minLength-1 strings, minItems 1,
      required)}` with `additionalProperties: false`. Description
      MUST state: form pages only; entries reference
      `config.fields[].key`; absent = single-step.
- [ ] Update `src/schemas/app-manifest-v2.schema.json`:
      add `$defs.fieldValidation` — `{required (boolean), min
      (number), max (number), pattern (string), message (string)}`,
      `additionalProperties: false`, descriptions covering the
      per-type semantics table from design.md (string/password =
      length + pattern; number = numeric bounds; boolean required =
      must be true).
- [ ] Update `src/schemas/app-manifest-v2.schema.json`:
      tighten `config.properties.fields.items` (currently a loose
      `additionalProperties: true` object) with two OPTIONAL typed
      properties — `visibleWhen: {$ref: "#/$defs/visibleWhen"}` and
      `validation: {$ref: "#/$defs/fieldValidation"}` — while KEEPING
      `additionalProperties: true` on the item itself (carry-forward
      field shapes must not break). Do NOT touch `$defs.visibleWhen`
      or the `pages[].type` enum.
- [ ] Bump the schema top-level `version` `2.18.0` → `2.19.0` (or the
      next sequential minor if another change landed first) and note
      the change in the schema `description` only if prior bumps did.
- [ ] Run `npm run build:validators` to regenerate
      `src/utils/validateManifestV2.compiled.js` (ADR-036: the
      runtime consumes the COMPILED module, not the JSON file).

## Phase 2 — v2 post-schema validation (REQ-MFL-5)

- [ ] Update `src/utils/validateManifest.js` — add a numbered
      post-schema check block inside `validateManifestV2()` (the v2
      path does NOT call `validateTypeConfig`; leave the v1 `case
      'form':` branch untouched) iterating `clone.pages` where
      `page.type === 'form'`:
      - `steps[].id` uniqueness,
      - every `steps[].fields[]` entry matches a declared
        `config.fields[].key` (error names the bad key),
      - when `steps` present: every declared key in exactly one step
        (errors name unassigned / duplicated keys),
      - `validation.min <= validation.max` when both set,
      - `validation.pattern` compiles (`new RegExp` in try/catch;
        error includes the regex failure hint),
      - `pattern` only on `string`/`password` fields; `min`/`max`
        only on `string`/`password`/`number` fields,
      - LOCAL-mode `visibleWhen` (no `endpoint`, no `source`): first
        dot-segment of `field` matches a declared field key.
      Error paths follow the existing `/pages/{i}/config/...` shape.

## Phase 3 — Runtime helpers (REQ-MFL-8, REQ-MFL-9)

- [ ] Update `src/utils/visibleWhen.js` — export
      `evaluateVisibleWhenLocal(cond, data)`: sync LOCAL-mode
      evaluation composed from `readVisibleWhenPath` +
      `compareVisibleWhen`; nullish cond → `true`; malformed cond
      (non-object, missing `field`, or `endpoint`/`source` present) →
      `false`. Extend the module docblock.
- [ ] Create `src/utils/formValidation.js` — export
      `validateFieldValue(field, value, t) → string|null`
      implementing the per-type rule table (required / min / max /
      pattern / message; built-in messages via
      `t('nextcloud-vue', …)` English msgids). Pure, no imports from
      components.
- [ ] Export both helpers from `src/utils/index.js` (match the
      existing barrel style).

## Phase 4 — CnFormPage rendering (REQ-MFL-6, REQ-MFL-7, REQ-MFL-9, REQ-MFL-10, REQ-MFL-12)

- [ ] Update `src/components/CnFormPage/CnFormPage.vue` — add the
      `steps` prop (Array, default `[]`) + data for
      `currentStepIndex`, `fieldErrors`, `remoteVisibility`.
- [ ] Update `src/components/CnFormPage/CnFormPage.vue` — visibility
      pipeline: computed `effectiveVisibility` doing the single-pass
      declaration-order cascade over `fields` using
      `evaluateVisibleWhenLocal` against the effective data (hidden
      → `undefined` downstream); `endpoint`/`source` conditions
      resolved once in `mounted()` via `evaluateVisibleWhen` into
      `remoteVisibility` (fail-safe hidden). Hidden fields keep their
      `formData` draft but are filtered from rendering, validation,
      and the dispatch payload (strip in `submit()` before
      endpoint/handler dispatch).
- [ ] Update `src/components/CnFormPage/CnFormPage.vue` — step
      chrome: `<nav>`-wrapped `<ol class="cn-form-page__steps">`
      indicator with `aria-current="step"`, current-step-only field
      rendering (step `fields[]` order), Back / Next / Submit footer
      per REQ-MFL-6 (Back never validates; fully-hidden steps skipped
      both directions; submit button only on the last step; `#submit`
      slot unchanged), `@step {from, to}` event. Empty `steps` ⇒
      existing single-step markup unchanged. NC CSS variables only.
- [ ] Update `src/components/CnFormPage/CnFormPage.vue` — validation
      gating: Next validates current step's visible fields, Submit
      validates all visible fields and jumps to the earliest invalid
      step; failures fill `fieldErrors` + focus the first invalid
      field (`$refs` + `focus()`); buttons never `disabled` for
      invalidity; editing a field clears its entry in `fieldErrors`;
      dispatch only on pass. Update the component docblock (props,
      events, decisions: hidden = unvalidated + excluded-from-payload
      + draft-retained).
- [ ] Update `src/composables/cnFormFieldRenderer.js` — accept
      optional `error` in the args object; when set, add
      `error: true` + `helperText: error` to the NcInputField-family
      bindings (`string`, `number`, `password`, `string-textarea`
      when NcTextArea, `fallback`); leave `boolean` / `enum` / `json`
      / native-textarea bindings untouched (CnFormPage renders the
      `role="alert"` sibling for those — wire `aria-describedby` from
      the field wrapper). Pass `error` through the `#field-<key>`
      scoped slot props.
- [ ] Update `src/components/CnWidgetFormRenderer/CnWidgetFormRenderer.vue`
      — declare the `steps` prop (Array, default `[]`) so
      `innerProps` forwards it to the inner CnFormPage.

## Phase 5 — Unit tests (Jest)

- [ ] Update `tests/schemas/app-manifest-v2.schema.spec.js` — REQ-MFL-1..5
      cases: steps valid / missing-title / closed-shape / stepless
      regression; visibleWhen local + source valid, bad `op`
      rejected, `@bogus.token` sentinel-through-new-shape rejected;
      validation full-shape valid, unknown-key rejected, non-numeric
      min rejected; post-schema: unknown step field key, unassigned
      field, duplicate step id, min>max, bad pattern, pattern-on-number,
      LOCAL ref to undeclared key.
- [ ] Update `tests/fixtures/manifest-all-types.json` — extend the
      `type: "form"` page with `steps` + one `visibleWhen` + one
      `validation` so the all-types fixture exercises the new shapes.
- [ ] Run `npx jest tests/schemas/fleet-manifest-regression.spec.js`
      — MUST stay green with zero fleet-fixture edits (additive
      change).
- [ ] Create `tests/utils/formValidation.spec.js` — REQ-MFL-8 cases:
      required per type (string-whitespace, number, boolean-true,
      enum, json), length vs numeric min/max, pattern match/mismatch,
      `message` override, translated defaults.
- [ ] Update `tests/components/visibleWhen.spec.js` — REQ-MFL-9
      helper cases: `evaluateVisibleWhenLocal` nullish → true,
      malformed → false, dot-path resolution, each operator.
- [ ] Update `tests/components/CnFormPage.spec.js` — REQ-MFL-6/7/9/10/11/12
      component cases: two-step indicator + `aria-current`, Next/Back
      navigation + `@step` payloads + draft retention, fully-hidden
      step skipped, stepless regression (existing cases untouched),
      required blocks Next + focus moves, submit jumps to earliest
      invalid step, editing clears the error, condition
      appear/disappear on live input, chained cascade (a→b→c),
      endpoint condition evaluated once + fail-safe hidden (mock
      fetch), hidden-required does not block submit, hidden value
      absent from dispatched payload (assert axios mock body),
      draft restored on re-show, NcTextField receives
      `error`/`helperText`, `role="alert"` sibling for enum,
      `#field-<key>` slot receives `error`, public-mode banner only
      after final-step dispatch.
- [ ] Update `tests/components/CnWidgetFormRenderer` coverage (in its
      existing spec home) — `steps` forwarded to the inner
      CnFormPage (REQ-MFL-12).

## Phase 6 — e2e (Playwright, this repo)

- [ ] Update `e2e/harness/App.vue` (+ `e2e/harness/main.js` if
      needed) — add a `?fl=1` gated view mounting CnFormPage with a
      2-step manifest config: one conditional field
      (`visibleWhen: {field: "kind", op: "eq", value: "company"}`),
      one `required` + `pattern` field, `submitEndpoint` stubbed to
      echo the payload into a `data-testid="fl-result"` node (mirror
      the `?fd=1` CnFormDialog harness pattern).
- [ ] Create `e2e/form-logic.e2e.js` — header `@spec` comment
      pointing at
      `openspec/changes/manifest-form-logic/specs/manifest-form-logic/spec.md`
      (REQ-MFL-6/7/9/10/11); tests: step indicator + Next/Back
      walk; required field blocks Next and shows the accessible
      error; flipping the condition shows/hides the dependent field;
      submit payload excludes the hidden field (assert `fl-result`
      content); success banner after final submit.

## Phase 7 — Docs

- [ ] Update `docs/components/cn-form-page.md` — new sections:
      "Multi-step wizards" (`steps` shape, key-reference rule,
      skipped-step behaviour), "Conditional fields" (`visibleWhen`
      reuse, LOCAL field-ref resolution, declaration-order cascade
      rule, remote-condition mount-time semantics + public-mode
      anonymous-fetch caveat), "Validation" (rule table, `message`
      override, hidden = unvalidated + excluded-from-payload
      decision, the leading-`@` pattern/sentinel caveat), worked
      wizard example.
- [ ] Update `docs/components/cn-widget-form-renderer.md` (if
      present; otherwise the widget's doc home) — mention `steps`
      forwarding.
- [ ] Run `npm run check:docs` — passes.

## Phase 8 — Verification

- [ ] Run `npm run build:validators` again — regeneration MUST
      produce no diff (compiled module in sync, REQ-MFL-4).
- [ ] Run `npm test` — full suite green (existing + new).
- [ ] Run `npx eslint src/schemas src/utils/formValidation.js
      src/utils/visibleWhen.js src/utils/validateManifest.js
      src/components/CnFormPage src/components/CnWidgetFormRenderer
      src/composables/cnFormFieldRenderer.js tests e2e/form-logic.e2e.js`
      — passes.
- [ ] Run `npx playwright test e2e/form-logic.e2e.js` — passes.
