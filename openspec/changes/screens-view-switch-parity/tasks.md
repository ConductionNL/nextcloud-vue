# Tasks: screens-view-switch-parity

> Four segments with disabled ones from the manifest, board icons and name (ADR-032 `kind: code`).

## Implementation tasks

### Task 1: `viewSwitch` and disabled segments
- **spec_ref**: `openspec/changes/screens-view-switch-parity/specs/view-switch-board-look/spec.md#requirement-the-manifest-can-draw-segments-the-page-cannot-open`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnActionsBar/CnActionsBar.vue`, `src/css/look-board-index.css`, `src/schemas/app-manifest-v2.schema.json`, `l10n/nl.json`, `l10n/en.json`, `tests/components/CnViewSwitchBoardParity.spec.js`
- **acceptance_criteria**:
  - Listed modes the page cannot open render disabled in the board order, inert, with the tooltip
  - Offered modes are not doubled; no key or no look leaves the switch as before
  - `viewSwitch` validates with the four modes only (schema 2.78.0)
- [x] Implement
- [x] Test

### Task 2: Board icons and the group name
- **spec_ref**: `openspec/changes/screens-view-switch-parity/specs/view-switch-board-look/spec.md#requirement-the-segments-carry-the-boards-icons`
- **files**: `src/components/CnActionsBar/CnActionsBar.vue`, `openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md`, `tests/components/CnActionsBarViewSwitchBoard.spec.js`
- **acceptance_criteria**:
  - 18px icons, plain bullets for the table, group named "View mode"
- [x] Implement
- [x] Test

### Task 3: Browser check against PqTickets
- **spec_ref**: `openspec/changes/screens-view-switch-parity/specs/view-switch-board-look/spec.md#requirement-the-manifest-can-draw-segments-the-page-cannot-open`
- **files**: `e2e/harness`
- **acceptance_criteria**:
  - Four segments, two disabled, measured in a browser
- [ ] Implement — not run: live check belongs to the app lanes once a manifest sets `viewSwitch`
- [ ] Test — not run: same reason
