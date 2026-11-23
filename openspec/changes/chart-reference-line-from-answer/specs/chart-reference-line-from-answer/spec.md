# chart-reference-line-from-answer Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A reference line can take its value from the endpoint answer

A chart reference line with `valuePath` SHALL take its value from that path in the chart's endpoint answer, and SHALL
not be drawn while the value is missing or not a number. `{value}` in its label SHALL read as the value.

#### Scenario: DqDoorlooptijd norm line

- **GIVEN** `referenceLines: [{ valuePath: "summary.normDays", label: "norm {value} days" }]` and an answer with
  `summary.normDays: 28`
- **THEN** a dashed line is drawn at 28 labelled "norm 28 dagen"

### Requirement: A year bucket keeps its name under a month format

With `categoryFormat` `month` or `month-year`, a category that names only a year ("2026") SHALL show as written.
