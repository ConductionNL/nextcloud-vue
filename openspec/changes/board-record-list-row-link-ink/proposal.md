---
kind: code
---

# Proposal: board-record-list-row-link-ink

## Summary

On DqContact and DqOrganisatie the "Zaken" card's rows (record-list `presentation: "rows"` with `rowRoute`) read as
one long link: title, case number, type, status and term all in the link colour and underlined. The boards draw a
list row: the title in the main ink, the meta muted, no underline. A row that opens its record is an `<a>`, and the
nldesign theme paints every `<a>` in its link colour and underline with `!important`, through its link tokens.

In the board look a record-list row link hands the theme the main ink and no underline, as board buttons that are
links already do. Hovering still underlines the title. The dashboard's rows keep their own rules.

## Scope

- `src/css/look-board.css`: one rule.
- No schema change; the Nextcloud look is unchanged.
