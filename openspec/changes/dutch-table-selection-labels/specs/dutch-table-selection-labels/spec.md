# dutch-table-selection-labels Delta

## Purpose

A Dutch reader, and a Dutch screen reader user in particular, meets every
string `CnDataTable` renders in Dutch.

## ADDED Requirements

### Requirement: A Dutch reader meets the data table's own strings in Dutch

The library's Dutch catalogue SHALL translate every string `CnDataTable`
passes to `t` or `n`, including the checkbox labels "Select all rows" and
"Select row", the scroll region names "Scrollable table" and "{title} —
scrollable table", and the plural "{count} selected".

#### Scenario: The selection checkboxes for a Dutch reader

- **GIVEN** the user's language is Dutch
- **WHEN** a selectable table labels its checkboxes
- **THEN** they read "Alle rijen selecteren" and "Rij selecteren"
- **AND** the scroll region reads "Scrollbare tabel" and a reference filter chip reads "3 geselecteerd"
- @e2e exclude the strings come from the catalogue, which `tests/l10n/tableSelectionDutch.spec.js` reads through the real @nextcloud/l10n; the e2e harness shims `t` and cannot see a translation
