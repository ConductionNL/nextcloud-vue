## ADDED Requirements

### Requirement: The threshold is named above its field

The saved view alert widget SHALL show the threshold's label above the number field as a `label` element tied to it,
not as a floating label inside the field.

#### Scenario: Alert on
- GIVEN an applied saved view with an alert at 12
- THEN a "Threshold" label sits above the field and its `for` matches the field's `id`
