# notes-card-composer-button Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [notes-card-composer-button](../../)

## Purpose

A notes card can open on its notes, with adding a note one click away.

## ADDED Requirements

### Requirement: A notes card can keep its composer behind a header button

With `composer: 'button'` CnNotesCard SHALL draw an "Add note" button in its card header and SHALL show the add form
only after that button is pressed or a reply is started; saving a note SHALL close the form again. A chromeless card
SHALL keep the form inline. The `notes` integration widget SHALL forward `composer`. Without it the card SHALL keep
its add form open as before.

#### Scenario: DqTaak "Notities"

- **GIVEN** a task's notes card with `composer: 'button'`
- **THEN** the card shows "Notitie toevoegen" in its header and no text field until it is pressed
