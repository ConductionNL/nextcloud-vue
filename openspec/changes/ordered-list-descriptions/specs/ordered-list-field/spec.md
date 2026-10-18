# ordered-list-field Delta: ordered-list-descriptions

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [ordered-list-descriptions](../../)

## Purpose

Give an ordered list's rows a second line and an icon.

## ADDED Requirements

### Requirement: A choice can carry a description and an icon

A CnOrderedListField choice with `description` SHALL show it as a muted second line under its label, in its row and
in the picker, and the row's move and remove buttons SHALL name it through `aria-describedby`. A choice with `icon`
SHALL show that icon in a small tile before the label, hidden from assistive tech. A choice without them SHALL render
as before.

#### Scenario: A case type with its open cases

- **GIVEN** the choice Woo request with description "19 open cases" and an icon
- **WHEN** it is in the list
- **THEN** its row shows the icon, the label and "19 open cases", and its buttons are described by that line
