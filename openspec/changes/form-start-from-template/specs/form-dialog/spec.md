## ADDED Requirements

### Requirement: A create form can start from a saved template

A create form with `templateSource` SHALL offer the record templates of that register and schema. Picking one SHALL fill
the form with the template's values that still fit a field of the form, SHALL name the values left out, and SHALL keep
what the person already changed. An edit form SHALL offer no templates.

#### Scenario: a property removed since the template was saved
- **GIVEN** a template with values for `title` and `room`, and a form that no longer has `room`
- **WHEN** the person picks the template
- **THEN** the title is filled and the form says `room` was not taken from the template
