---
kind: code
---

# Proposal: abstract-radio-cards

## Summary

Ruben, 11 Oct 2026: pages are manifest configuration over abstract widgets. PtPortalInstellingen draws "Aanmelden" as
three cards (Niemand, Met goedkeuring, Iedereen), each with a radio dot, a bold title and a description, one
selected. The same "one of a few, with an explanation" choice recurs wherever a setting is an enum with consequences.
The `radio-cards` widget (CnRadioCardsWidget) binds the cards to an enum field of the current object and saves a
choice at once with one PATCH of that field.

`CnChoiceCards` was checked first. It is a v-model component built on `CnCard` (stats, tags, icons) for the setup
wizard; it holds no object, saves nothing and does not draw the board's radio-dot card. Reusing it would have meant
a wrapper that re-draws every card, so this widget has its own small markup; the real-radio-input approach is the same.

## Scope

New widget, docs, unit tests, harness e2e. No schema change. Stacked on switch-rows (#1519) and settings-form (#1515).
