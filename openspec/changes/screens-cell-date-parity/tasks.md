# Tasks: screens-cell-date-parity

> Age cell, board short date and the reference column check (ADR-032 `kind: code`).
> Checkbox budget: 3 tasks x 2 = 6 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: The age widget
- **spec_ref**: `openspec/changes/screens-cell-date-parity/specs/cell-date-age/spec.md#requirement-an-age-cell-says-how-long-something-has-waited`
- **files**: `src/utils/boardDate.js`, `src/components/CnCellRenderer/CnCellRenderer.vue`, `src/css/look-board.css`, `l10n/en.json`, `l10n/nl.json`, `docs/components/cn-cell-renderer.md`, `tests/utils/boardDate.spec.js`, `tests/components/CnCellRendererAgeBoardDate.spec.js`
- **acceptance_criteria**:
  - Hours under a day, calendar days after, in en and nl
  - `variantWhen` on the shown days colours the cell; weight 600 under the board look
- [x] Implement
- [x] Test

### Task 2: The board short date
- **spec_ref**: `openspec/changes/screens-cell-date-parity/specs/cell-date-age/spec.md#requirement-a-board-date-cell-reads-day-and-short-month-in-the-user-language`
- **files**: `src/utils/boardDate.js`, `src/components/CnCellRenderer/CnCellRenderer.vue`, `docs/components/cn-cell-renderer.md`, `tests/utils/boardDate.spec.js`, `tests/components/CnCellRendererAgeBoardDate.spec.js`
- **acceptance_criteria**:
  - "5 okt" for a Dutch reader on the en_US locale; the year outside the current year
  - Without the look the schema date stays `NcDateTime` and the date widget its full form
- [x] Implement
- [x] Test

### Task 3: The reference column (existing behaviour, proved for pipelinq)
- **spec_ref**: `openspec/changes/screens-cell-date-parity/specs/cell-date-age/spec.md#requirement-a-reference-column-shows-the-referenced-name-from-one-batched-request`
- **files**: `tests/components/CnIndexPageRefLabelsClient.spec.js`
- **acceptance_criteria**:
  - The `client` uuid `$ref` resolves against the page register through `refLabel`
  - Three rows over two clients make one request
- [x] Implement
- [x] Test

## Not run

- Browser check of PqTickets and DqAanMijToegewezen: needs the app lanes to declare the age and Klant columns. Not run: the app manifests are not in this repo.
