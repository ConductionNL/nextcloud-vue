# Proposal: action-dialog-checks-cards

## Why

Three dialogs on the dossiq boards are almost `CnActionDialog` dialogs. DqZaakDialogen "In tweeën splitsen" ticks which
documents and parties go along. DqZaakSamenwerken "Zaak delen met een andere organisatie" chooses between two explained
options. DqZaakDialogen "Bekend in een ander domein" asks for a number and a ground, then says what it found. The dialog
has a checkbox per field, a select, and a fixed done text, so these would each be hand-built.

## What changes

- A `checks` field: several items to tick, from `options` or the record's `itemsPath`, sent as a list.
- A `cards` field: one choice out of explained options, drawn with `CnChoiceCards`.
- `confirm.request.answerPath`: the text at that path of the answer shows once the act ran, in place of `doneText`.

Backward compatible: existing field types and `doneText` keep working as they did. Covers gaps 12, 14 and 15 of the dossiq
component-gap audit (decision 281). Gap 13 "Samenvoegen" needed no change: the `search` field, the reason and the note draw
it.
