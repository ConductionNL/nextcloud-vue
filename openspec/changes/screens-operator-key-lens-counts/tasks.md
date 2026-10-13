# Tasks: screens-operator-key-lens-counts

### Task 1: Count an operator key through the list endpoint
- **spec_ref**: `openspec/changes/screens-operator-key-lens-counts/specs/index-page/spec.md#requirement-a-lens-with-an-operator-in-a-key-is-counted-through-the-list-endpoint`
- **files**: `src/utils/fetchFilterCounts.js`
- [x] Implement: `hasOperatorKey`, in `needsListEndpoint` and `singleEqualityOf`
- [x] Test: `tests/utils/fetchFilterCounts.spec.js`; e2e `e2e/l8-operator-key-counts.e2e.js` (fails without the change)
