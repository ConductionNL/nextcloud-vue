---
kind: code
---

# Proposal: screens-radio-cards-list

## Summary

Board DcBeheer draws "Soort organisatie" as a compact list of radio buttons: one per line, the description in small
muted text under the label, no box around each, 8px apart. The radio-cards widget draws every option as a bordered card
of about 70px, so five options take twice the board's height and push every card below it down (decidiq #1729). The
widget gets a list variant.

## Scope

- `src/components/CnRadioCardsWidget/CnRadioCardsWidget.vue`: `content.variant` (`cards` default, `list`).
- No manifest schema change: radio-cards is a content-only widget whose content the manifest schema does not define.
