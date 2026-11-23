---
kind: code
---

# Proposal: abstract-choice-picker

## Summary

Ruben, 11 Oct 2026: pages are manifest configuration over abstract widgets. PtPortalInstellingen draws "Huisstijl" as
cards with a radio, colour swatches, a title and a state pill ("Leesbaar", "Slecht leesbaar", "Niet gecontroleerd"),
a warning band for a risky card, and two buttons: "Opslaan" and "Toch gebruiken". portaliq's `PortalTheme` is the app
component for it. The same shape fits any choice from a catalogue with a verdict (theme sets, templates, layouts).

The `choice-picker` widget (CnChoicePickerWidget) reads its cards from a source (or a static list): key, title, swatch
colours, a state pill mapped from a field, a refusal reason, and warning lines. It saves with a button: a PATCH of the
configured field, or a configured request whose payload carries `@value` and `@confirmed`.

Existing widgets checked: `radio-cards` (item 3) saves on selection and has no swatches, pill, source or confirm;
`CnChoiceCards` is a wizard v-model component. This one is a save-with-confirm picker from a source.

## Scope

New widget, docs, unit tests, harness e2e. No schema change. Stacked on toggle-table and the widgets before it.
