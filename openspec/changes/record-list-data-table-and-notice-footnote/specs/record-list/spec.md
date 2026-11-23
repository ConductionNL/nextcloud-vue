# record-list Delta: record-list-data-table-and-notice-footnote

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A record-list table can be drawn as a data table

A `table` record-list with `content.tableLook: "data"` SHALL carry the class `cn-record-list--data-table`, and the
board look SHALL draw it with a near-white header band at 14px/600 in the muted ink (10px 12px) and 14px cells
(11px 12px) with a hairline above each row. Without `tableLook` the board's compact grid SHALL stay.

#### Scenario: DqZaaktype Berichten aan de aanvrager

- **THEN** the Moment, Kanaal, Bericht header reads as the board's card table, rows 40px apart

### Requirement: A record-list footnote can be a toned notice

With `content.footnoteVariant` set to `info`, `warning` or `error`, the footnote SHALL be drawn as a notice box in
that tone with its icon; without it the footnote SHALL stay a muted line.

#### Scenario: The opt-out note

- **THEN** "Heeft iemand zich afgemeld voor berichten ..." reads in a blue info box with the information icon
