# settings-fields-inline-save-and-advanced Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [settings-fields-inline-save-and-advanced](../../)

## Purpose

A settings section can be laid out as the boards draw it without leaving any of its fields out.

## ADDED Requirements

### Requirement: A section can draw its save button beside the form

With `saveInline` CnSettingsFieldsSection SHALL draw its one Save button beside the field grid, lined up with the
control, and SHALL NOT draw it under the form. Without it the button SHALL stay under the form.

#### Scenario: Serviceaccount

- **GIVEN** a section with one field and `saveInline`, `saveLabel: "Use this account"`
- **THEN** "Use this account" stands beside the user name field

### Requirement: Advanced fields sit behind one disclosure

Fields with `advanced: true` SHALL be drawn after the other fields behind one button with `aria-expanded` and
`aria-controls`, closed at first, labelled `advancedLabel` or "Advanced". A refused advanced field SHALL open the
disclosure. Advanced fields SHALL be read and saved with the rest. Without an advanced field there SHALL be no
disclosure.

#### Scenario: Zaak-e-mail

- **GIVEN** the mailbox section with the sender address marked `advanced`
- **THEN** the sender address is hidden behind "Geavanceerd" until it is opened, and saved with the folder
