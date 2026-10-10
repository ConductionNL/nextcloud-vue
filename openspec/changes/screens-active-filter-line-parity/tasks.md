# Tasks: screens-active-filter-line-parity

> The Active line and Filter badge for quick filters, named values, end-of-month tokens (ADR-032 `kind: code`).

## Implementation tasks

### Task 1: Quick filters on the Active line and the badge
- **spec_ref**: `openspec/changes/screens-active-filter-line-parity/specs/active-filter-line-board-look/spec.md#requirement-a-quick-filter-with-an-active-label-joins-the-active-line`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `tests/components/CnIndexActiveFilterLine.spec.js`
- **acceptance_criteria**:
  - A selected tab with `activeLabel` gives a translated chip; without it, none
  - Remove and Clear all go back to the default tab, or to none when the default is named
  - Nothing changes without the board look
- [x] Implement
- [x] Test

### Task 2: Named values on the Active line
- **spec_ref**: `openspec/changes/screens-active-filter-line-parity/specs/active-filter-line-board-look/spec.md#requirement-an-active-chip-names-the-value-not-its-id`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `tests/components/CnIndexActiveFilterLine.spec.js`
- **acceptance_criteria**:
  - Reference label, facet label, `oneOf` title, raw value, in that order
  - A reference filter without a reference column joins the label batch
- [x] Implement
- [x] Test

### Task 3: `@monthEnd` and `@nextMonthStart`
- **spec_ref**: `openspec/changes/screens-active-filter-line-parity/specs/active-filter-line-board-look/spec.md#requirement-the-filter-vocabulary-names-the-end-of-the-month`
- **files**: `src/utils/resolveFilterTokens.js`, `src/utils/sentinelTokens.js`, `src/schemas/app-manifest-v2.schema.json`, `tests/components/CnIndexActiveFilterLine.spec.js`
- **acceptance_criteria**:
  - Both resolve in local time, across February and the year end
  - The schema pattern and the vocabulary pattern stay byte equal (schema 2.78.0)
- [x] Implement
- [x] Test

### Task 4: Browser check against PqLeads
- **spec_ref**: `openspec/changes/screens-active-filter-line-parity/specs/active-filter-line-board-look/spec.md#requirement-a-quick-filter-with-an-active-label-joins-the-active-line`
- **files**: `e2e/harness`
- **acceptance_criteria**:
  - The line and badge read as PqLeads in a browser
- [ ] Implement — not run: live check belongs to the pipelinq app lane once the app declares `activeLabel`
- [ ] Test — not run: same reason
