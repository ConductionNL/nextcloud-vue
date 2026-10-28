# fk-resolve-secondary-line Delta

## ADDED Requirements

### Requirement: A reference cell can carry a muted line from the record it resolves

An `fkResolve` cell with `widgetProps.secondaryTemplate` SHALL draw a muted line under the resolved label, filled from
the resolved object after `widgetProps.secondaryLabels` turned the values it names into words. Without a template the
cell SHALL draw its one line as before.

#### Scenario: Board PqBiExport

- **GIVEN** a job whose destination is "Datawarehouse" of type `postgres`
- **AND** the column's `secondaryTemplate: "{type}"` with `secondaryLabels: { type: { postgres: "PostgreSQL" } }`
- **THEN** the cell reads "Datawarehouse" with "PostgreSQL" beneath it
