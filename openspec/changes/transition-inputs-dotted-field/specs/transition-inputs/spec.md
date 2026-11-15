## ADDED Requirements

### Requirement: An input can name a sub-field by a dotted path

Transition inputs whose `field` is a dotted path `parent.child` SHALL be drawn as one object input on `parent` that asks
exactly those children, in their declared order. A child SHALL be required when its own input says `required: true`,
and SHALL carry its own input's `label` when it gives one. The form SHALL send the parent as one object.

#### Scenario: MAS route required, note optional
- **GIVEN** inputs `[{ field: "municipalityFeedback.masRoute", required: true }, { field: "municipalityFeedback.note" }]`
- **THEN** the dialog shows the two fields and cannot be confirmed until the MAS route is filled
