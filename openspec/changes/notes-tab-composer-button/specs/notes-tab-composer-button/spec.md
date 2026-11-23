# notes-tab-composer-button Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [notes-tab-composer-button](../../)

## Purpose

The notes tab can open on its notes, with adding a note one click away, as the notes card can.

## ADDED Requirements

### Requirement: The notes tab can keep its composer behind a button

With `composer: 'button'` CnNotesTab SHALL draw an "Add note" button and SHALL show the add form only after that
button is pressed, a reply is started or a note is edited; saving a note SHALL close the form again. The `notes`
integration widget SHALL forward `composer` to the tab. Without it the tab SHALL keep its add form open as before.
In the board look the button SHALL be the 40px control.

#### Scenario: DqZaakEmail "Notities"

- **GIVEN** the case notes with mentions and `composer: 'button'`
- **THEN** the notes show "Notitie toevoegen" and no text field until it is pressed
