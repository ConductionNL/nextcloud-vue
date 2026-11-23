# cn-data-table: header filters without a schema

## ADDED Requirements

### Requirement: REQ-DT-AUD-001 Header filters on every table whose columns are known

`CnIndexPage` SHALL show header filters on every self-fetching table, on any table
with a schema, and on a host-fed table whose host listens for `filter-change`.
Without a schema a column SHALL filter by its hints: an `fkResolve` widget as a
reference, a `type` or `format` as number, date or yes/no, and any other plain key as
text on contains (`key[like]`). A path, a metadata key, a computed column and
`filterable: false` SHALL get no filter.

#### Scenario: A manifest page whose schema did not resolve

- **GIVEN** a products index with columns `name` and `barcode` and no resolved schema
- **WHEN** the table renders
- **THEN** each of those headers SHALL offer a filter, and filtering `name` on "acme" SHALL send `name[like]=acme`
