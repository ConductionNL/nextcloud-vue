---
kind: code
---

# Proposal: board-note-rows-tile-room

## Summary

In r30, DqTaak "Notities" drew the initials tile over the note's first letters, with each row 103px tall where the board's
is about 61. Three causes, read with the headless probe:

- Every note sits alone in its thread, so it is also a `:last-child`. The combined row rule's `padding: 12px 0` under
  `:last-child` outranked the `padding-inline-start: 44px` the tile needs.
- The Delete button's `position: absolute` (scoped) tied with NcButton's own `position: relative`, which loads later, so
  the button stood in the flow as a 34px line under every note. This happened in every look.
- The title and the meta line kept the 1.35 / 22.5 line heights.

## Scope

- `src/css/look-board-detail.css`: rows set `padding-block` (events `padding-inline: 0`). A note keeps `padding-inline: 44px 0`
  under `:last-child` too. Reply leaves the flow as Delete does, shown on hover and on focus. Title and meta use the
  normal line height.
- `src/components/CnNotesCard/CnNotesCard.vue`: the Delete rule leads with the note's class, so it outranks NcButton. It
  also shows on `:focus-within`. Reply gets the class `cn-notes-card__reply-btn`.

The probe with the rules injected read text at 44 and rows of 60px.
