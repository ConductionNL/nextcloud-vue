# Delta: action-dialog-readiness-row-pitch

## ADDED Requirements

### Requirement: The readiness rows have no gap between them

The checklist read from an endpoint MUST draw its rows directly under each other, divided by their hairline. The spacing of a `checks` field MUST NOT apply to that list.

#### Scenario: a dialog with a checklist and a checks field

- GIVEN a `CnActionDialog` with a `checklist` and a `checks` field
- WHEN the dialog is drawn
- THEN the fieldset has the class `cn-action-dialog__check-field` and not `cn-action-dialog__checks`
