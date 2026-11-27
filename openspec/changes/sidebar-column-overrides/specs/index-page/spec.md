# index-page Delta: sidebar-column-overrides

## ADDED Requirements

### Requirement: A column turned on in the sidebar gets the page's column overrides

An index page SHALL apply its `columnOverrides` to a schema column the person turns on in the sidebar's Columns tab,
the same way it applies them to a column the page declares. A column without an override for its key SHALL be
built from the schema as before.

#### Scenario: A date column turned on in the sidebar

- **GIVEN** an index page with the columns `title`, a schema property `scheduledDate` with format `date`, and
  `columnOverrides` `{ scheduledDate: { formatter: "numericDate" } }`
- **WHEN** the person turns on `scheduledDate` in the Columns tab
- **THEN** the table's `scheduledDate` column has the formatter `numericDate`

#### Scenario: A column without an override

- **GIVEN** the same page with `columnOverrides` `{ title: { label: "Name" } }`
- **WHEN** the person turns on `scheduledDate` in the Columns tab
- **THEN** the table's `scheduledDate` column has its schema label "Date" and no formatter

### Requirement: Both column pickers show a column's override label

The sidebar's Columns tab and the table header's column menu SHALL show the same label for a schema column. When
`columnOverrides` sets a `label` for a key, both SHALL show that label; otherwise both SHALL show the schema label.

#### Scenario: An override label

- **GIVEN** an index page with `columnOverrides` `{ title: { label: "Name" } }`
- **WHEN** the person opens the sidebar's Columns tab
- **THEN** the `title` column is listed as "Name", as it is in the table header's column menu
