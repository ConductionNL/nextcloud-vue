# Tasks: screens-cell-pill-parity

> The board's status pill tones and per-column colours (ADR-032 `kind: code`).
> Checkbox budget: 3 tasks x 2 = 6 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: The purple and teal tones
- **spec_ref**: `openspec/changes/screens-cell-pill-parity/specs/cell-pill-tones/spec.md#requirement-a-status-pill-has-eight-tones`
- **files**: `src/utils/badgeVariants.js`, `src/components/CnStatusBadge/CnStatusBadge.vue`, `src/components/CnBoardView/CnBoardView.vue`, `src/css/badge.css`, `src/schemas/app-manifest-v2.schema.json`, `tests/components/CnCellPillTones.spec.js`
- **acceptance_criteria**:
  - `purple` and `teal` validate and resolve through a `colorMap`
  - Their colours are tokens on `:root` with the board values
  - The schema tone enums list eight names; schema version 2.76.0 and its hash recorded
- [x] Implement
- [x] Test

### Task 2: The column colorMap
- **spec_ref**: `openspec/changes/screens-cell-pill-parity/specs/cell-pill-tones/spec.md#requirement-a-manifest-column-colours-its-enum-pills`
- **files**: `src/components/CnDataTable/CnDataTable.vue`, `docs/components/cn-data-table.md`, `tests/components/CnCellPillTones.spec.js`
- **acceptance_criteria**:
  - A column `colorMap` colours the pill by the raw value
  - It wins over the schema `x-color-map`; no map renders as before
- [x] Implement
- [x] Test

### Task 3: The primary ink under the board look
- **spec_ref**: `openspec/changes/screens-cell-pill-parity/specs/cell-pill-tones/spec.md#requirement-a-primary-pill-uses-the-deep-primary-ink-under-the-board-look`
- **files**: `src/css/look-board.css`, `docs/components/cn-status-badge.md`, `tests/components/CnCellPillTones.spec.js`
- **acceptance_criteria**:
  - The rule is scoped to `.cn-look-board` with the `cn-look-nextcloud` guard
  - The default look keeps `--color-primary-element`
- [x] Implement
- [x] Test

## Not run

- Browser check of PqTickets against the board: needs the pipelinq lane to declare the column maps first. Not run: the app manifest is not in this repo.
