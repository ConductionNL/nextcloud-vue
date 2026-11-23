## ADDED Requirements

### Requirement: A field override can ask for the full width and for textarea rows

In a two-column CnFormDialog a field whose override sets `width: 'full'` MUST span both columns, whatever its widget. A textarea field MUST be as many rows high as its `rows` (a positive whole number) and 4 rows without it. A single-column form MUST ignore `width`.

#### Scenario: The ticket edit dialog as the board draws it
- GIVEN a two-column edit form with overrides `title: { width: 'full' }` and `description: { widget: 'textarea', rows: 3 }`
- WHEN the dialog opens
- THEN Title spans both columns and Description is a three-row textarea across both columns
- AND a field without overrides keeps its half of the row
