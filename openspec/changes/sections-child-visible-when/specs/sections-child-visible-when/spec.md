# sections-child-visible-when Delta: sections-child-visible-when

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [sections-child-visible-when](../../)

## Purpose

A section of a `sections` widget on a detail page shows under the same condition as its widget would in the grid.

## ADDED Requirements

### Requirement: A section on a detail page follows its widget's condition

On a detail page CnSectionsWidget SHALL draw a section only while its widget's own `visibleWhen` holds, when that
condition reads a field of the record. Without a record, and for a workspace condition or one that needs a request,
the section SHALL draw as before.

#### Scenario: Board PqContactmoment

- **GIVEN** a sections widget whose section "About this request" has `visibleWhen: { field: "parentTicket", op: "notEmpty" }`
- **WHEN** the contact moment has no parent ticket
- **THEN** the section, its heading and its rule are not drawn
- **AND** on a contact moment with a parent ticket it is drawn

#### Scenario: No record

- **GIVEN** the same sections widget without a record
- **THEN** every section draws
