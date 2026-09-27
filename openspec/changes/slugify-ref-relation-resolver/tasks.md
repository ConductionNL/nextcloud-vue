# Tasks: slugify-ref-relation-resolver

Spec ref: `openspec/changes/slugify-ref-relation-resolver/specs/schema-ref-resolution/spec.md`
(new capability — REQ-SRR-1, REQ-SRR-2, REQ-SRR-3, REQ-SRR-4).

## 1. The helper

- [x] 1.1 Add `src/utils/schemaRefSlug.js` exporting `schemaRefSlug(ref)`:
      kebab-cases a PascalCase/camelCase/spaced title, takes the tail of a
      JSON-Pointer `$ref`, folds punctuation/parentheses to single dashes,
      trims dash ends, is idempotent on an already-kebab value, and passes
      a numeric schema id through unchanged. Matches OpenRegister's
      `SchemaMapper::generateSlug()` convention plus the camelCase-boundary
      splitting these registers' hand-authored multi-word slugs need.
- [x] 1.2 `tests/utils/schemaRefSlug.spec.js` — PascalCase, single word,
      already-kebab (idempotent), spaces + parentheses, acronym run,
      JSON-Pointer tail, numeric id, numeric-string, null/undefined/NaN/empty.

## 2. Form field resolvers (`schema.js`)

- [x] 2.1 Route `normalizeRef()`'s string-tail return through
      `schemaRefSlug()`, so `fieldsFromSchema()`'s `reference.schema`
      descriptor — and therefore every `CnFormDialog` consumer of it
      (`fetchReferenceOptions`, `resolveReferenceLabel`,
      `applyTemplateFill`, dynamic-property prefill) — carries the correct
      slug with no changes needed in `CnFormDialog` itself.
- [x] 2.2 `tests/utils/schema.spec.js` — new regression test:
      `reportPeriodId`/`learnerRef` $refs slugify to `report-period`/
      `learner-profile`.
- [x] 2.3 Correct the two pre-existing assertions that encoded the old
      pass-through behaviour: `caseType` → `case-type`,
      `Decision` → `decision`.
- [x] 2.4 `tests/components/CnFormDialogRelationFilter.spec.js` — its
      `callsFor()` fixture polled store calls keyed by the raw `statusType`
      string; updated to `status-type` to match the corrected slug.

## 3. The related widget (`CnObjectDataWidget.vue`)

- [x] 3.1 In `relationProp()`, slugify the extracted `$ref` tail before
      building `{ target: '<register>/<slug>' }` — the exact site of the
      `ReportCardDetail` blank-panel defect (both `loadRelationOptions()`
      and `resolveRelations()` fetch off this target).
- [x] 3.2 `tests/components/CnObjectDataWidgetRelationSlug.spec.js` — new
      file: multi-word PascalCase (scalar + array `items.$ref`),
      single-word, already-kebab, numeric id.

## 4. The object-list widget's FK resolver (`actionsDispatcher.js`)

- [x] 4.1 In `resolveObjectOpType()`, slugify `source.schema` before both
      the registry-match comparison and the fallback registration — the
      shared resolver behind `CnFkResolveCell` (used by
      `CnObjectListWidget`'s grouped headers and `CnCellRenderer`'s
      `fkResolve` cell widget), plus `CnStatWidget`, `CnChartWidget`,
      `CnActionButtons`, `CnStagesWidget`, `CnWidgetObjectTable`.
      Idempotent — every existing caller passing an already-correct slug
      is unaffected (all of their own component tests mock this function).
- [x] 4.2 `tests/utils/actionsDispatcher.spec.js` — new
      `resolveObjectOpType` describe block: PascalCase title,
      already-kebab, registry-hit by raw pair, registry-hit by
      `registerSlug`/`schemaSlug` hint, numeric schema id.

## 5. Spec

- [x] 5.1 `specs/schema-ref-resolution/spec.md` — new capability
      documenting the slugging contract (REQ-SRR-1..4) with GIVEN/WHEN/THEN
      scenarios per call site.

## 6. Verification

- [x] 6.1 `openspec validate slugify-ref-relation-resolver --strict`
- [x] 6.2 Diff-scoped: `npx eslint <touched files>`,
      `npx jest <touched + dependent spec files>`
- [x] 6.3 Full pre-push: `npm run lint`, `npm test`, `npm run build`
      (each via the lane's `with-slot.sh` semaphore)
