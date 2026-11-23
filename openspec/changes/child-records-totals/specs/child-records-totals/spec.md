# child-records-totals Delta: child-records-totals

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [child-records-totals](../../)

## Purpose

A user edits order lines inside a form and sees each line total and the totals under the table, and adds a line from a catalogue or by a code.

## ADDED Requirements

### Requirement: A child-records table can show computed columns

With `config.computed`, `CnChildRecordsField` SHALL add one read-only column per entry after the plain columns, worked out per row from its formula.
A formula SHALL name row keys and earlier computed keys, and an empty value SHALL count as 0. A formula SHALL NOT run through `eval`.
With `store`, the field SHALL write the value into the row whenever the row changes.

#### Scenario: Board PqOfferte, a line total

- **GIVEN** a computed column `lineTotal` with the formula `qty * price * (1 - discount / 100)`
- **AND** a row with `qty` 1, `price` 50 and `discount` 10
- **THEN** the row shows `45.00` in the column Line total

#### Scenario: A stored value follows an edit

- **GIVEN** the computed column `lineTotal` with `store`
- **WHEN** the user sets `qty` to 3 on a row with `price` 10
- **THEN** the row is written with `lineTotal` 30

### Requirement: A child-records table can show totals

With `config.totals`, the field SHALL draw one row per entry under the table, with the label as a row header. A total with `sum` SHALL add that formula over every row.
A total with `formula` SHALL work over the totals above it. The field SHALL emit `totals` with the value per key. Without `totals` it SHALL draw no footer.

#### Scenario: Subtotal, tax and total

- **GIVEN** rows with line totals 20 at 21% and 45 at 9%
- **AND** the totals `subtotal` (sum `lineTotal`), `tax` (sum `lineTotal * vatRate / 100`) and `total` (formula `subtotal + tax`)
- **THEN** the footer reads Subtotal 65.00, Tax 8.25 and Total 73.25
- **AND** `totals` is emitted with `total` 73.25

### Requirement: A child-records table can add rows from another schema

With `config.addFrom`, the field SHALL offer a search over the records of `addFrom.schema` next to Add row. A picked record SHALL become a new row through `map`,
where `@id` copies the record's id. With `codeField`, a code field SHALL add the one record whose `codeField` equals the typed or scanned code and then clear.
No match, or more than one, SHALL show an error and add nothing. A screen reader SHALL hear which record was added. With `freeRows: false` the field SHALL hide Add row.

#### Scenario: Board PqKassaAfrekenen, a scanned barcode

- **GIVEN** `addFrom` with `codeField` `barcode` and one product with barcode `871`
- **WHEN** the user scans `871`
- **THEN** a row with that product's mapped values is added and the code field is empty

#### Scenario: An unknown code

- **WHEN** the user types `999` and no record has that code
- **THEN** the field shows "No record has the code 999." and adds no row

#### Scenario: Board PqOfferte, a catalogue next to a free row

- **GIVEN** `addFrom` without `freeRows`
- **THEN** the search and Add row both show
