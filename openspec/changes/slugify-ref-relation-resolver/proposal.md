---
kind: code
---

## Why

OpenRegister resolves `GET /api/objects/{register}/{schema}/...` by schema
**slug**, case-insensitively for a single-word title (`Cohort` and `cohort`
both answer 200). A `$ref` on a schema property is authored as the
referenced schema's **title** (`ReportPeriod`, `LearnerProfile`), not its
slug — and a multi-word title is registered under its kebab-case slug
(`report-period`, `learner-profile`). Every resolver in this library that
built an objects-API path straight from a raw `$ref` therefore 404s on any
multi-word schema, while a single-word one works by accident. Verified
2026-09-25 (curl): `ReportPeriod` / `LearnerProfile` → 404; `report-period` /
`learner-profile` → 200. This is learniq round-1 defect 7 — 128 properties
across 52 distinct multi-word schema titles in learniq's own register are
affected, and it is why `ReportCardDetail` renders with every relation panel
blank (`ReportCard.reportPeriodId` → `ReportPeriod`, `ReportCard.learnerRef`
→ `LearnerProfile`, both 404). Other M1 rows degraded the same way: 7.6, 4.7,
4.11, 8.3, 8.4, 9.7.

The register itself is not wrong — it authors `$ref` as the title because
that is what the schema editor writes and what a human reads. The bug is
that three independent resolvers in this shared library each re-derived an
objects-API path segment from that raw title instead of asking "what does
the objects API actually call this schema". Fixing it once, in this
library, fixes it for every consumer app without a single register edit.

**dossiq uses the same title dialect for its register** and is very likely
hit by the identical defect on any multi-word schema title it declares as a
`$ref` — worth a targeted check once this ships, not blocking this PR.

## What Changes

- Add `schemaRefSlug()` (`src/utils/schemaRefSlug.js`): a pure, idempotent
  helper that kebab-cases a `$ref` value (PascalCase or spaced title, a
  JSON-Pointer form, or a numeric schema id passed through unchanged) into
  the slug OpenRegister's objects API actually resolves.
- Route every place that turns a `$ref` into an objects-API path segment
  through it:
  - `src/utils/schema.js` — `normalizeRef()`, which builds the
    `field.reference.schema` descriptor `fieldsFromSchema()` attaches to
    every form field. This is the single choke point for every "form field
    resolver" in `CnFormDialog` (`fetchReferenceOptions`,
    `resolveReferenceLabel`, `applyTemplateFill`, dynamic-property
    prefill) — they all consume `field.reference.schema`, so fixing it
    here fixes all of them without touching `CnFormDialog` itself.
  - `src/components/CnObjectDataWidget/CnObjectDataWidget.vue` —
    `relationProp()`, the detail-page **related widget**'s `$ref` → target
    resolver. This is the exact site of the `ReportCardDetail` defect: it
    builds `{ target: '<register>/<slug>' }` from the raw `$ref` and both
    `loadRelationOptions()` and `resolveRelations()` fetch straight off
    that target.
  - `src/utils/actionsDispatcher.js` — `resolveObjectOpType()`, the shared
    resolver behind `CnFkResolveCell` (the **object-list widget**'s FK
    label resolution, via `CnObjectListWidget`'s grouped headers and
    `CnCellRenderer`'s `fkResolve` cell widget) as well as
    `CnStatWidget`, `CnChartWidget`, `CnActionButtons`,
    `CnStagesWidget`, and `CnWidgetObjectTable`. Idempotent, so every
    existing caller that already passes a correct slug is unaffected.
- Update two schema.js unit tests whose expectations encoded the old (buggy)
  pass-through behaviour (`caseType` → `caseType`, `Decision` → `Decision`)
  to the corrected slug output (`case-type`, `decision`), and one
  `CnFormDialogRelationFilter` fixture that asserted store calls under the
  raw `statusType` key to assert under `status-type` instead.
- New `schema-ref-resolution` OpenSpec capability (none existed for this
  resolver) documenting the slugging contract all three call sites share.

## Capabilities

### New Capabilities

- `schema-ref-resolution`: a `$ref` schema reference SHALL be resolved to
  OpenRegister's objects-API schema slug (kebab-case, idempotent) before
  it is used to build any objects-API path, everywhere this library
  resolves one.

### Modified Capabilities
<!-- none — no existing capability spec covered this resolver -->

## Impact

- **Code**: `src/utils/schemaRefSlug.js` (new), `src/utils/schema.js`,
  `src/components/CnObjectDataWidget/CnObjectDataWidget.vue`,
  `src/utils/actionsDispatcher.js`.
- **Tests**: `tests/utils/schemaRefSlug.spec.js` (new),
  `tests/utils/schema.spec.js` (2 assertions corrected to the fixed
  behaviour, 1 new regression test), `tests/utils/actionsDispatcher.spec.js`
  (new `resolveObjectOpType` describe block),
  `tests/components/CnObjectDataWidgetRelationSlug.spec.js` (new),
  `tests/components/CnFormDialogRelationFilter.spec.js` (fixture key
  updated to match the corrected slug).
- **Consumers**: every app rendering a detail page with a multi-word `$ref`
  relation (learniq's `ReportCardDetail`, `LearningPlanDetail`, and
  others per learniq round-1 defect 7), any `CnFormDialog` picker over a
  multi-word referenced schema, and any `fkResolve` table/list cell over
  one. No breaking changes: `schemaRefSlug()` is a new export, all three
  fixed functions keep their existing signatures, and the fix is
  idempotent for every already-correct caller.
- **No backend/schema changes.** No register edits required — this is a
  client-only fix.
- **Not in scope**: dossiq's register (flagged above, not verified here);
  rewriting learniq's or any other app's register `$ref`s to slugs (the
  M-sized, per-app alternative this proposal deliberately avoids).

## Rollback Strategy

`schemaRefSlug()` is additive; the three call-site edits are each a
one-line wrap of an existing value. Reverting the four source-file diffs
(and the corresponding three test-fixture diffs) restores the previous
(buggy) behaviour with no data migration.
