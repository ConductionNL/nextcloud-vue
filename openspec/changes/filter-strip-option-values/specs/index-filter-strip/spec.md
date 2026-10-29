# index-filter-strip Delta

## ADDED Requirements

### Requirement: A filter strip pill can gather several values

A `filterStrip` option MAY name `values`, a list of stored values, in place of `value`. The pill SHALL count the rows
whose field holds any of them, picking it SHALL filter the field on that list, and it SHALL show pressed while the
field's filter is that list.

#### Scenario: Board PqWachtrij channel strip

- **WHEN** the queue declares the option Telefoon with values `phone` and `telefoon`
- **THEN** the Telefoon pill counts the request on `phone` and the contact moment on `telefoon`
- **AND** picking it lists both
