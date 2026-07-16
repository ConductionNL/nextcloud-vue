## 1. CnIndexPage component

- [x] 1.1 Add `allowExport: boolean` prop (default `false`) to `src/components/CnIndexPage/CnIndexPage.vue`.
- [x] 1.2 Add export helper (e.g. `src/utils/indexExportHelpers.js`): `buildExportUrl(register, schema, routeQuery, format)` — constructs the OR export-leaf URL with filters passed through.
- [x] 1.3 In CnIndexPage's toolbar/header, conditionally render an Export menu (NcActions) when `allowExport && schema?.exportable`. Menu has two entries: "Export as CSV" and "Export as Excel"; each navigates to the URL from 1.2 via `window.location.assign()`.
- [x] 1.4 Ensure menu is accessible: aria-labels set, keyboard navigable (NcActions handles this by default).

## 2. CnDataTable component (if applicable)

- [x] 2.1 If CnDataTable wraps CnIndexPage or has its own toolbar, apply the same export action or delegate to CnIndexPage's logic. — N/A: CnDataTable has no toolbar of its own (it's the table widget CnIndexPage embeds); the Export menu lives solely on CnIndexPage's CnActionsBar.

## 3. Tests

- [x] 3.1 Add `tests/vitest/indexExportHelpers.spec.js`: unit tests for URL construction (format, register, schema, route-query passthrough with arrays, null-skipping). — Added at `tests/utils/indexExportHelpers.spec.js` (this repo's test runner is Jest, not Vitest; matches the existing `tests/utils/*.spec.js` convention).
- [x] 3.2 Add `tests/vitest/CnIndexPage.export.spec.js` or extend existing CnIndexPageMount.spec.js: mount CnIndexPage with `allowExport: true` and an exportable schema mock; verify Export menu renders and clicking navigates to the correct URL. — Added at `tests/components/CnIndexPageExport.spec.js`.
- [x] 3.3 Mount CnIndexPage with `allowExport: false` or a non-exportable schema; verify Export menu does NOT render.
- [x] 3.4 Run full `npm test` (vitest + e2e) — no regressions. — `npm test` (Jest): 446 suites / 4976 tests passed.

## 4. Verify

- [x] 4.1 `npm run build` compiles (new component code, no TS errors).
- [x] 4.2 eslint/prettier clean on new/changed files.
- [x] 4.3 `openspec validate cnindexpage-export-action` passes.

## 5. Documentation

- [x] 5.1 Update CnIndexPage component docblock: document the `allowExport` prop and export behavior.
- [x] 5.2 If there is a storybook or component guide, add a story: CnIndexPage with `allowExport: true` (exportable schema) showing the Export menu. — Added an `allowExport` row + description to `src/components/CnIndexPage/CnIndexPage.md` (styleguide) and `docs/components/cn-index-page.md`; no dedicated new-scenario story exists in this repo's styleguide format beyond the props table entries.

## Acceptance Criteria

- CnIndexPage accepts `allowExport: boolean` prop; defaults to `false`.
- When `allowExport: true` and schema is `exportable: true`, Export menu renders with CSV/Excel options.
- Clicking Export navigates to OR export-leaf URL with route filters passed through.
- No Export menu when `allowExport: false` or schema not `exportable`.
- All tests green; no regressions.

## Quality Checklist

- Default-safe: `allowExport` defaults to `false` (no unexpected exports).
- i18n keys English via `t('nc-vue', ...)`.
- No new dependencies; uses existing NcActions, router APIs.
- Accessibility: aria-labels, keyboard navigation.
