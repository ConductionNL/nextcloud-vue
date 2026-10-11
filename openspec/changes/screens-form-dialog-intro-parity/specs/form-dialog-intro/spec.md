# form-dialog-intro Delta: screens-form-dialog-intro-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-form-dialog-intro-parity](../../)

## Purpose

A manifest create dialog with the board's eyebrow and intro sentence, as
DqNieuweZaak draws it.

## ADDED Requirements

### Requirement: An open-form action names the dialog's eyebrow and intro

The manifest schema SHALL accept the optional string keys `formEyebrow` and
`formSubtitle` on an action. CnActionButtons SHALL pass them, through the host
translate, to the open-form create dialog as `eyebrow` and `subtitle`; an
absent key SHALL pass an empty string, so the dialog renders as before.

#### Scenario: The new case dialog

- **GIVEN** an open-form action with formTitle New case, formEyebrow All cases and formSubtitle "Fields with * are required.", under the board look
- **WHEN** the user opens it
- **THEN** the dialog shows All cases above the title New case and the sentence under it

@e2e include Open the new case dialog on dossiq/DqNieuweZaak and read the eyebrow and the intro line.

#### Scenario: An action without the keys

- **GIVEN** an open-form action with neither key
- **WHEN** the user opens it
- **THEN** the dialog has no eyebrow and no intro sentence
