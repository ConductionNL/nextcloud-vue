# facts-row-first-of Delta: facts-row-first-of

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [facts-row-first-of](../../)

## Purpose

A facts row shows the first of several values that gives text.

## ADDED Requirements

### Requirement: A facts row can show the first value that gives text

CnFactsWidget SHALL read an entry that carries `firstOf` (and is not a lead) as the first of its specs that gives text,
each spec a path or `{ path, map?, format? }`. When none gives text the entry SHALL be empty.

#### Scenario: Board PqContactmoment

- **GIVEN** the row Subject with `firstOf: ["disposition_subject", "category"]`
- **WHEN** the contact moment has `disposition_subject` "Afvalpas" and `category` "afval"
- **THEN** the row reads "Afvalpas"
- **AND** on a contact moment without `disposition_subject` it reads its category
