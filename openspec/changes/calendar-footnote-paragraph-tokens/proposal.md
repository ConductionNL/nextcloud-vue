---
kind: code
---

# Proposal: calendar-footnote-paragraph-tokens

## Summary

DqInstellingenAlgemeen draws the working calendar's footnote at 13px, muted. Live (r25b probe) it read 15px in the text ink: thematiq's paragraph rule sets every `p`'s size, line height and colour with `!important` from the `--nldesign-component-paragraph-*` tokens, which beats the widget's own rule. The footnote and the calendar's note now set those tokens, as the dialog and settings descriptions already do.

## Scope

- `src/components/CnWorkingCalendarWidget/CnWorkingCalendarWidget.vue`, `tests/components/CnWorkingCalendarFootnote.spec.js`. No schema change.
