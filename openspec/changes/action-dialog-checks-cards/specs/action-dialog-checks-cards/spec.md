# action-dialog-checks-cards Delta: action-dialog-checks-cards

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [action-dialog-checks-cards](../../)

## Purpose

A manifest can configure a split, a share and a lookup with `CnActionDialog`, without a hand-built dialog.

## ADDED Requirements

### Requirement: A field ticks several items

A `checks` field SHALL list its items from `options`, or from the record at `itemsPath`, each with a checkbox labelled by
`optionLabel` and `optionSecondary`, inside a fieldset whose legend is the field's label. It SHALL start on `default`, a
list of values or `"all"`, and SHALL send the ticked values as a list under its `field`. Unless `required` is false, the
confirm SHALL stay off while nothing is ticked. With no items it SHALL say so.

#### Scenario: Board DqZaakDialogen "Documenten die meegaan"

- **GIVEN** a `checks` field with `itemsPath` "documents", `optionLabel` "{name}" and a `default` of the first document
- **THEN** both documents are listed and the first is ticked
- **WHEN** the user ticks the second and confirms
- **THEN** the request body holds both ids as a list

#### Scenario: Nothing ticked on a required field

- **GIVEN** a required `checks` field with no `default`
- **THEN** the confirm is off until an item is ticked

### Requirement: A field offers one choice as cards

A `cards` field SHALL draw `options` with `CnChoiceCards`, start on `default`, and send the chosen value under its `field`.
Unless `required` is false, the confirm SHALL stay off while nothing is chosen.

#### Scenario: Board DqZaakSamenwerken "Delen" or "Overdragen"

- **GIVEN** a `cards` field with options share and transfer and `default` share
- **THEN** the request body holds share until the user chooses transfer

### Requirement: The done text can come from the answer

With `confirm.request.answerPath`, the dialog SHALL show the text at that path of the answer once the act ran, in place
of `doneText`. An answer without that path SHALL fall back to `doneText`.

#### Scenario: Board DqZaakDialogen "Bekend in een ander domein"

- **GIVEN** `answerPath` "message" and an answer `{ message: "Geen open zaak in een ander domein." }`
- **THEN** the dialog says "Geen open zaak in een ander domein." once the lookup ran
