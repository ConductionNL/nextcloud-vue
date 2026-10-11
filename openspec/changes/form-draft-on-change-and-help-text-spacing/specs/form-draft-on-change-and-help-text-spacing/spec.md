# form-draft-on-change-and-help-text-spacing Delta: form-draft-on-change-and-help-text-spacing

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [form-draft-on-change-and-help-text-spacing](../../)

## Purpose

A form only says it kept a draft when somebody typed something, the draft is
that person's alone, and the help text under every field can be read in full,
once.

## ADDED Requirements

### Requirement: A draft is written only after a person changes a field

CnFormDialog SHALL write a local draft, and SHALL show "Saving" or "Saved" in
its draft indicator, only while at least one field a person edited holds a
value different from the value the form opened with. Values the form fills in
by itself after it opens (an input reporting its value back, normalised dates,
defaults, the active organisation) SHALL NOT count. An empty string, null,
undefined and an empty list SHALL count as the same value. When the edited
fields are back to the values the form opened with, the dialog SHALL cancel a
pending write, remove the draft it wrote and show nothing.

#### Scenario: Opening an edit dialog writes nothing

- **GIVEN** a stored record and no draft for it
- **WHEN** a person opens its edit dialog and does not type
- **THEN** no draft is written to browser storage
- **AND** the draft indicator stays empty

#### Scenario: A change writes the draft

- **GIVEN** an open edit dialog
- **WHEN** the person changes the title
- **THEN** the indicator says "Saving", then "Saved just now"
- **AND** the draft holds the new title

#### Scenario: Undoing the change removes the draft

- **GIVEN** a dialog whose draft was written after a change
- **WHEN** the person puts the field back to the value it opened with
- **THEN** the draft is removed and the indicator is empty

### Requirement: A draft belongs to the signed-in user

CnFormDialog and CnFormPage SHALL key a draft on `draftUserId` when the host
passes it, else on the signed-in Nextcloud user (`getCurrentUser().uid`), and
on `anonymous` only when nobody is signed in. Once a signed-in user is known,
they SHALL remove every draft stored under `anonymous` and SHALL NOT offer or
move one to that user.

#### Scenario: No user passed, somebody signed in

- **GIVEN** a dialog without `draftUserId` and the signed-in user `cluade`
- **WHEN** cluade changes a field
- **THEN** the draft key ends in `:cluade`

#### Scenario: An anonymous draft is not offered

- **GIVEN** a draft stored under `anonymous` for the same form
- **WHEN** a signed-in user opens the form
- **THEN** no draft is offered
- **AND** the anonymous draft is removed from browser storage

#### Scenario: Nobody signed in

- **GIVEN** no signed-in user and a draft stored under `anonymous`
- **WHEN** the form opens
- **THEN** that draft is offered, as before

### Requirement: Help text starts below every input

The help line under a CnFormDialog field SHALL start at or below the bottom
edge of the control above it, for text, e-mail and number inputs and for
selects, in the Nextcloud look and the board look, in light and dark.

#### Scenario: Board look text input

- **GIVEN** a CnFormDialog in the board look with a text field that has a description
- **WHEN** it renders
- **THEN** the help line's top is at or below the input's bottom edge, and within 12px of it

### Requirement: A field description shows once

When CnFormDialog shows a field's description as the help line under a text,
e-mail, number or textarea control, it SHALL leave the control's placeholder
empty. While a validation error takes the help line's place, the placeholder
SHALL carry the description.

#### Scenario: Description and placeholder

- **GIVEN** a text field with the description "Job title or role in the organisation."
- **WHEN** the dialog renders
- **THEN** the help line reads that description
- **AND** the input has no placeholder

#### Scenario: An error replaces the help line

- **GIVEN** the same field in the Nextcloud look with a validation error
- **WHEN** the dialog renders
- **THEN** the input's placeholder is the description
