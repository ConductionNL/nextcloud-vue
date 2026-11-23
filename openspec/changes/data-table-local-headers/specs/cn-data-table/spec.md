# cn-data-table Delta: data-table-local-headers

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [data-table-local-headers](../../)

## Purpose

A table that holds all its rows sorts and filters them from its own headers.

## ADDED Requirements

### Requirement: A table can sort and filter the rows it holds

CnDataTable SHALL accept `localHeaders`. With it, a header sort SHALL order the `rows` the table was given by the first
sort key, and a header filter SHALL keep the rows that match it, both in the browser and without a host passing the
state back. The table SHALL still emit `sort` and `column-filter`. Without it, the table SHALL show `rows` as given.

#### Scenario: Board PqBeheerMarketing

- **GIVEN** a mail transports table with `localHeaders` and `filterable`, holding three transports
- **WHEN** the admin filters Kind on "smtp"
- **THEN** only the smtp transport shows, with a chip that clears the filter

#### Scenario: Sorting by name

- **GIVEN** the same table
- **WHEN** the admin clicks the Name head twice
- **THEN** the rows run A to Z, then Z to A, and the head's `aria-sort` follows
