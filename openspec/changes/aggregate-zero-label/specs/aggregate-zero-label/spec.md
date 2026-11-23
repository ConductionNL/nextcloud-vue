# aggregate-zero-label Delta

## Purpose

A count column reads as the boards draw it: "Geen" where a row has nothing
to count, without changing any column that does not ask for it.

## ADDED Requirements

### Requirement: A count column can name zero

`CnDataTable` SHALL render a resolved count of zero in a column whose
`aggregate.zeroLabel` is a non-empty string as that label, passed through the
injected `cnTranslate`. A column without `zeroLabel` SHALL keep rendering a
zero count as `0`. A pending count SHALL keep reading "…" and a failed count
"—" in both cases.

#### Scenario: A zero count with a label

- **GIVEN** a column with `aggregate: { schema: "automationLog", op: "count", zeroLabel: "None" }`
- **AND** the app's `cnTranslate` answers "Geen" for "None"
- **WHEN** a row's count resolves to 0 and another row's to 4
- **THEN** the first cell reads "Geen" and the second "4"
- @e2e exclude a pure value mapping, covered by `tests/components/CnDataTable.spec.js`

#### Scenario: A zero count without a label

- **GIVEN** a count column without `zeroLabel`
- **WHEN** a row's count resolves to 0
- **THEN** the cell reads "0"
- @e2e exclude the unchanged default, covered by `tests/components/CnDataTable.spec.js`
