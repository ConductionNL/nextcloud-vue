# action-dialog Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [action-dialog-optional-fields](../../)

## Purpose

A reader can tell which questions they may skip.

## ADDED Requirements

### Requirement: An optional field says so beside its label

A CnActionDialog select or text field with `required: false` SHALL draw its label above the control followed by
"(optional)" in grey, the label's `for` naming the control. A select SHALL show its `placeholder`, filled from the
record. A required field SHALL keep its control's own label.

#### Scenario: DqUwWachtrij

- **GIVEN** the "Plan an item" dialog with an optional Template select
- **THEN** it reads "Sjabloon (niet verplicht)" over "Kies een sjabloon (optioneel)"
