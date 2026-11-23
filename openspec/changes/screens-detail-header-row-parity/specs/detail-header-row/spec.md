# detail-header-row Delta: screens-detail-header-row-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-detail-header-row-parity](../../)

## Purpose

Row 2 of the detail header on one line, as the DqZaak and PtAccount boards
draw it.

## ADDED Requirements

### Requirement: Row 2 of the detail header is one line

Under the board look, the pills, the breadcrumb, the middle dot and the meta
line of the detail header's row 2 SHALL sit on one line, in that order, 8px
apart, when they fit the width. The breadcrumb SHALL take its content's width
and be at most 24px high; its crumbs SHALL be 14px text without button
padding; the record's crumb SHALL be muted text. Without the board look the
breadcrumb SHALL render as before.

#### Scenario: The PtAccount header

- **GIVEN** a detail page under the board look with a status pill, a breadcrumb (Accounts / the record) and a meta line, 1440px wide
- **WHEN** it renders
- **THEN** the pill, "Accounts / R. Mulder", the dot and the meta line share one line

@e2e include Measured on the harness (`e2e/screens-detail-header-row-parity.e2e.js`); live on portaliq/PtAccount and dossiq/DqZaak.
