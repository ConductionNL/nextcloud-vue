## ADDED Requirements

### Requirement: A table column can name candidate templates

A `table` column whose `value` is a list of templates SHALL show, per row, the
first template that fills; a column whose candidates all stay empty SHALL show
an empty cell.

#### Scenario: a household row that only says a case exists
- GIVEN a column `{ "label": "Case", "value": ["{identifier} {title}", "{domain}"] }`
- WHEN a row holds `{ domain: "Participatiewet" }` and no identifier or title
- THEN its cell reads "Participatiewet"

### Requirement: An empty toned cell draws no label

A `table` column with a `tone` SHALL draw no coloured label in a cell whose
text is empty.
