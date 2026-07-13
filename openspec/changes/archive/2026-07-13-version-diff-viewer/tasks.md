## 1. Pure diff utility

- [x] 1.1 Add `src/utils/computeObjectDiff.js` exporting `computeObjectDiff(oldValue, newValue)`: recursive nested-object/array diff, path notation `a.b[0].c`, classifies `added`/`removed`/`changed`/`unchanged`, distinguishes explicit `null` from an absent key.
- [x] 1.2 Unit tests `tests/utils/computeObjectDiff.spec.js`: flat added/removed/changed/unchanged, nested objects, arrays (append/remove/reorder-by-index), type changes (string→number, object→array), null vs. missing key, deeply nested mixed structures, empty-object/array edge cases, does-not-mutate-input invariant.

## 2. Audit-trail folding utility

- [x] 2.1 Add `src/utils/auditTrailDiff.js` exporting `foldAuditTrailEntries(entries)`: folds an oldest-first ordered array of audit-trail entries' `changed` maps into `{oldState, newState}` (first-seen old, last-seen new per field); tolerates entries with missing/malformed `changed`.
- [x] 2.2 Unit tests `tests/utils/auditTrailDiff.spec.js`: single entry, multi-entry fold (field touched once vs. repeatedly), empty array, malformed entries ignored gracefully.

## 3. CnVersionHistory component

- [x] 3.1 Add `src/components/CnVersionHistory/CnVersionHistory.vue`: `CnDetailCard`-based list of audit-trail entries (timestamp, user, semantic `version`, `action`), newest-first, fetched from `GET {apiBase}/objects/{register}/{schema}/{objectId}/audit-trails` with `limit`/`_page`/`_sort[created]=DESC` (mirrors `CnAuditTrailTab`'s real pagination convention: `results`/`total` envelope, `Load more`).
- [x] 3.2 Row-level "select for compare" checkboxes (max 2 selections) plus a click-to-view-diff on a single row; a "Compare" action activates once exactly 2 rows are checked.
- [x] 3.3 Diff view: field | old value | new value table built from `computeObjectDiff` over the `foldAuditTrailEntries`-derived `{oldState, newState}` for the selected range (a single selected row is a range of one). Changed-only by default; "Show all fields" toggle reveals `unchanged` rows too.
- [x] 3.4 Nested object/array values render JSON-pretty-printed with per-line tinting: added lines `--color-success` tint, removed `--color-error` tint, changed `--color-warning` tint — no hardcoded colors.
- [x] 3.5 Loading (`NcLoadingIcon`) / empty (`No version history yet`) / error (swallow to empty + `console.error`) states matching `CnAuditTrailCard` conventions; all user-facing strings are English-default translatable props.
- [x] 3.6 100% JSDoc on props/events/methods (component + both new utils).

## 4. Registration

- [x] 4.1 `src/components/CnVersionHistory/index.js` barrel; add to `src/components/index.js` and `src/index.js`.
- [x] 4.2 Add `src/integrations/builtin/version-history.js` (id `version-history`, `tab: CnVersionHistory`, `widget: CnVersionHistory`) and register it in `src/integrations/builtin/index.js`'s bespoke block (after `auditTrailIntegration`, before the comms group) — does not collide with or replace the existing `audit-trail` id.
- [x] 4.3 `docs/components/cn-version-history.md` docs page.

## 5. Tests

- [x] 5.1 `tests/components/CnVersionHistory.spec.js`: renders history list newest-first, empty state, changed-only-by-default diff table, "Show all fields" toggle reveals unchanged rows, single-row diff, two-row compare folds the range, nested add/remove/change tinting classes present.
- [x] 5.2 Full `npm test` (not bare `npx jest`) — no regressions.

## 6. Verify

- [x] 6.1 `npm run build` compiles.
- [x] 6.2 `npm run lint` clean on new/changed files.
- [x] 6.3 `openspec validate version-diff-viewer --type change --strict` passes.

## Acceptance Criteria

- `computeObjectDiff` correctly classifies added/removed/changed/unchanged at arbitrary nesting depth, distinguishing `null` from an absent key, without mutating its inputs.
- `foldAuditTrailEntries` correctly reconstructs a before/after state pair across a range of audit-trail entries.
- `CnVersionHistory` lists version/audit history newest-first with OpenRegister-matching pagination, and its diff view defaults to changed-only fields with a working "Show all fields" toggle and NC-CSS-variable-only add/remove/change tinting.
- Registered via the same three-tier barrel + integration-descriptor pattern as `CnAuditTrailCard`, so consuming apps adopt it with zero code.
- All tests green; no regressions.

## Quality Checklist

- i18n keys English (`t('nextcloud-vue', ...)`).
- SPDX docblocks on new files.
- No sed/awk/scripted edits.
- No hardcoded colors — NC CSS variables only.
- Additive only — no changes to `CnAuditTrailCard`/`CnAuditTrailTab`/the `audit-trail` integration.
