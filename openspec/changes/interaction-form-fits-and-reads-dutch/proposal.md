---
kind: code
---

# Proposal: interaction-form-fits-and-reads-dutch

## Summary

pipelinq's "Nieuw contactmoment" card (CnInteractionFormWidget) at 1100 wide is 234px wide. Two problems showed there:

- The channel and client selects ran about 40px past the card's right edge, because NcSelect sets a minimum width of 260px on itself.
- A Dutch reader saw "Channel", "Outcome", "Phone" and "Save contact moment" in English. The library had no Dutch for its own "Channel" and "Outcome". The channel labels from the manifest were shown exactly as written, and the submit label was passed only to the app's translate.

In a form widget a select now takes the width of its field. A label that the manifest supplies (a channel, an outcome or the submit label) goes through the app's translate first, because those are the app's words, then through the library's catalogue, and is otherwise shown as written. The library catalogue gains Dutch for the widget's own labels and for the common channel and submit words.

## Scope

- `src/css/form-widget.css`: `.cn-form-widget .v-select.select` loses NcSelect's 260px minimum. The textarea becomes `box-sizing: border-box`.
- `src/components/CnInteractionFormWidget/CnInteractionFormWidget.vue`: `copy()`, used for channel, outcome and submit labels.
- `l10n/nl.json` and `l10n/en.json`: Channel, Outcome, Chat, Counter, Social media, Letter, Save contact moment, Saving…, Subject is required, Cannot save right now, Failed to save interaction.
- No schema change.
