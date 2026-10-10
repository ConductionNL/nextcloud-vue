# Tasks: screens-detail-header-row-parity

## Implementation Tasks

### Task 1: Row 2 of the detail header is one line
- **spec_ref**: `openspec/changes/screens-detail-header-row-parity/specs/detail-header-row/spec.md#requirement-row-2-of-the-detail-header-is-one-line`
- **files**: `src/css/look-board-detail.css`, `e2e/harness/ScreensDetailHarness.vue`, `e2e/screens-detail-header-row-parity.e2e.js`
- [x] Implement: the row 2 breadcrumb rules under `.cn-look-board`
- [x] Test: e2e on the harness (`?screensdetail=tabs&header=1`): one line, order, gap, height, both crumbs visible; fails without the rules (pills and crumbs 51px apart)

### Task 2: Live check
- [ ] Pixel diff PtAccount and DqZaak on :8080 after a release (not run: the apps run the released package)
