# action-dialog Delta: action-dialog-share-look-and-outcome

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [action-dialog-share-look-and-outcome](../../)

## Purpose

A dialog configured on `CnActionDialog` can draw a board's choice rows, plain checkbox and spacing, and can end the way a
hand-built dialog did: a toast naming what was chosen, then closed.

## ADDED Requirements

### Requirement: A dialog draws the board's choice rows, plain checkbox and spacing

A cards field SHALL pass its `layout` (`rows` or `cards`), a numeric `columns` and `hideLabel` to `CnChoiceCards`. A
checkbox field with `look: 'plain'` SHALL be drawn without the tinted box. A numeric `gap` SHALL set the room between the
dialog's parts in px. Without these keys the dialog SHALL draw as before.

#### Scenario: Board DqZaakSamenwerken

- **GIVEN** a cards field with `layout: 'rows'`, `columns: 2`, `hideLabel: true`, a checkbox field with `look: 'plain'`
  and `gap: 16`
- **WHEN** the dialog opens
- **THEN** Share and Hand over stand as two rows side by side without a visible label, the checkbox has no tinted box and
  the parts stand 16px apart

### Requirement: The done text names what was chosen

The done text SHALL be filled from the sent values (`{fields.<key>}`), the entry a select field's `optionsSource` gave for
the chosen option (`{chosen.<field>.<path>}`), the record and `{objectId}`; when it does not fill it SHALL be shown as
written. A request body SHALL read `{chosen.<field>.<path>}` and `{objectId}` too.

#### Scenario: The toast names the organisation

- **GIVEN** a `doneText` "The case is shared with {chosen.organisation.name}." and an organisation chosen from an
  `optionsSource`
- **WHEN** the act runs
- **THEN** the dialog says "The case is shared with Utrecht."

### Requirement: The dialog can close once the act ran

With `closeOnDone: true` the dialog SHALL, once the act ran, refresh the page, emit `done`, show the done text as a
success toast and emit `close`, rather than showing the done text in the dialog. A failed act SHALL show the server's
`message` or `error`, else the request's or `confirm`'s `errorText`, else the library's sentence.

#### Scenario: Shared, said and closed

- **GIVEN** `closeOnDone: true`
- **WHEN** the act runs
- **THEN** a success toast says the done text and the dialog emits `close`

#### Scenario: A failure the server does not word

- **GIVEN** `confirm.errorText` "The case could not be shared."
- **WHEN** the request fails without a message
- **THEN** the dialog shows "The case could not be shared."
