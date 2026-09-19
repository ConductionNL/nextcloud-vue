# Tasks: status-board-and-date-axis

> A board and a date axis become view modes of the index page (ADR-032 `kind: code`).
> Checkbox budget: 6 tasks x 2 = 12 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: `board` and `dateAxis` as view modes
- **spec_ref**: `openspec/changes/status-board-and-date-axis/specs/index-page/spec.md#requirement-the-index-page-offers-a-board-bound-to-the-status-field`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnActionsBar/CnActionsBar.vue`, `src/manifest/schema/manifest-v2.schema.json`, `src/manifest/validateManifestV2.js`
- **acceptance_criteria**:
  - `viewMode` accepts `board` and `dateAxis`, default stays `table`
  - The toggle gains the segments only for the modes `config.viewModes` lists
  - `board.statusField` naming a field with no enum and no lifecycle fails
    validation naming the page — NOT DONE, and it cannot be: the stages live
    in the register schema and the manifest does not contain it, so no
    manifest-time check can see them. The schema refuses the structural half
    (a board with no `statusField` at all), and `CnBoardView` says so on
    screen rather than drawing empty columns.
  - A page listing neither mode renders exactly as before
- [x] Implement
- [x] Test

### Task 2: `CnBoardView`, columns from the field
- **spec_ref**: `openspec/changes/status-board-and-date-axis/specs/index-page/spec.md#requirement-the-index-page-offers-a-board-bound-to-the-status-field`
- **files**: `src/components/CnBoardView/CnBoardView.vue`, `src/components/CnBoardView/index.js`, `src/components/index.js`, `src/index.js`, `src/components/__tests__/CnBoardView.spec.js`
- **acceptance_criteria**:
  - Columns render from the status field's enum or lifecycle, in the schema's order
  - A status the schema hides is not a column
  - Cards render the fields `board.cardFields` names and click through like a table row
  - Each column pages and labels its count as the loaded count when the total is unconfirmed
- [x] Implement
- [x] Test

### Task 3: A drop runs a transition
- **spec_ref**: `openspec/changes/status-board-and-date-axis/specs/index-page/spec.md#requirement-moving-a-card-runs-a-transition-and-a-refusal-is-shown`
- **files**: `src/components/CnBoardView/CnBoardView.vue`, `src/composables/useListView.js`, `src/components/__tests__/CnBoardViewTransition.spec.js`
- **acceptance_criteria**:
  - A drop asks the host to run the transition and never writes the status field directly
  - A refused transition returns the card and renders the guard's own message
  - A card moved by somebody else is re-read, and the move is not forced
  - Move to on the card menu runs the same transition from the keyboard
- [x] Implement
- [x] Test

### Task 4: The second axis
- **spec_ref**: `openspec/changes/status-board-and-date-axis/specs/index-page/spec.md#requirement-a-board-groups-into-rows-by-a-second-field`
- **files**: `src/components/CnBoardView/CnBoardView.vue`, `src/components/__tests__/CnBoardViewSwimlanes.spec.js`
- **acceptance_criteria**:
  - `swimlaneField` groups the cards into rows while the columns stay the stages
  - No `swimlaneField` renders one row and no row headers
  - A row collapses and stays collapsed while the user is on the view
  - Cards with no value for the field land in one named row, never dropped
- [x] Implement
- [x] Test

### Task 5: `CnDateAxisView`
- **spec_ref**: `openspec/changes/status-board-and-date-axis/specs/index-page/spec.md#requirement-the-date-axis-shows-overlapping-work-and-hides-nothing`
- **files**: `src/components/CnDateAxisView/CnDateAxisView.vue`, `src/components/CnDateAxisView/index.js`, `src/components/index.js`, `src/index.js`, `src/components/__tests__/CnDateAxisView.spec.js`
- **acceptance_criteria**:
  - Rows with a start and an end render on a time scale, one lane per `laneField` value, overlaps visible
  - Rows missing a date land in a visible unplanned lane
  - The window is the user's choice and nothing reschedules from the view
  - The view is operable from the keyboard and every bar carries an accessible name
- [x] Implement
- [x] Test

### Task 6: A filter per mode, docs and the dossiq handover
- **spec_ref**: `openspec/changes/status-board-and-date-axis/specs/index-page/spec.md#requirement-each-view-mode-keeps-its-own-filter`
- **files**: `src/composables/useListView.js`, `docs/components/cn-index-page.md`, `docs/components/cn-board-view.md`, `docs/components/cn-date-axis-view.md`
- **acceptance_criteria**:
  - A filter set on the board does not follow the user to the table, and the view's own criteria do
  - JSDoc and the three reference docs list every new prop, event and config key
  - dossiq is told the manifest key and the transition contract so `WorkflowBoard.vue` can be replaced
  - `npm test` and `npm run build` pass
- [x] Implement
- [x] Test
