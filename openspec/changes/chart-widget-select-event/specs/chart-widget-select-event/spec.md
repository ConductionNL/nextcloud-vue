## ADDED Requirements

### Requirement: A chart can say which category the reader picked

A CnChartWidget with `selectable` SHALL emit `select` with `{ field, value, label, index }` when the reader clicks a
slice, a bar or a bar-list row: `field` the field the chart groups by, `value` the category's raw key. It SHALL emit
nothing for the folded "Other" bucket, and a declared drilldown SHALL still navigate.

#### Scenario: picking a status
- **GIVEN** a donut over `aggregate: { groupBy: "status" }` with `selectable`
- **WHEN** the reader clicks the slice of status `new`
- **THEN** the chart emits `select` with `{ field: "status", value: "new" }`
