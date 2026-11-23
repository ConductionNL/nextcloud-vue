# Tasks: screens-one-scroller-parity

> One scrollbar at the window edge, no width cap, no navigation scrollbars, under the board look (ADR-032 `kind: code`).

## Implementation tasks

### Task 1: No width cap
- **spec_ref**: `openspec/changes/screens-one-scroller-parity/specs/app-look/spec.md#requirement-the-content-spans-the-content-area`
- **files**: `src/css/look-board.css`, `tests/css/lookBoardChrome.spec.js`, `e2e/screens-index-card-chrome-parity.e2e.js`, `openspec/changes/screens-chrome-parity/specs/app-look/spec.md`, `docs/components/cn-admin-settings-shell.md`
- **acceptance_criteria**:
  - `--cn-board-content-max-width` is `none`; no 1240px left in the board stylesheet
- [x] Implement
- [x] Test

### Task 2: One scroller and no navigation scrollbars
- **spec_ref**: `openspec/changes/screens-one-scroller-parity/specs/app-look/spec.md#requirement-one-scrollbar-at-the-window-edge`
- **files**: `src/css/look-board.css`, `tests/css/lookBoardChrome.spec.js`
- **acceptance_criteria**:
  - The board dashboard page is `height: auto; overflow-y: visible`
  - The navigation body is `overflow: visible`, the list draws no scrollbar
- [x] Implement
- [x] Test

### Task 3: Browser check on :8080
- **spec_ref**: `openspec/changes/screens-one-scroller-parity/specs/app-look/spec.md#requirement-one-scrollbar-at-the-window-edge`
- **files**: none (measured by CSS injection on the live apps)
- **acceptance_criteria**:
  - dossiq Mijn werk at 1920: page 1656px wide, `NcAppContent` the only scroller, flush with the window edge
- [x] Implement
- [x] Test — measured by injecting the new rules into the live page (dossiq, pipelinq, portaliq); the e2e harness check (task 1) not run here: e2e runs in CI
