---
kind: code
---

# Proposal: board-row-icon-tile

## Summary

Boards draw a table's leading icon on a 32px tile:

- radius 8, with an 18px glyph;
- 12px before the title.

The tile is teal on DqOrganisaties and PqOrganisaties, light primary on most other boards (BqPagina*, KqExtensie,
OcThemas, LqLes), and neutral on SkCmdb. Live drew a bare 20px icon in a 40px column, with the title 16px after it.

In the board look the leading icon now sits on that tile. The page's `rowIconTone` (`primary` by default, `teal`,
`neutral`) picks the tone; CnIndexPage forwards it to CnDataTable. The geometry was probed on :8080 with the rules
injected: tile 32 at x 76, title at x 120, as on the board.

## Scope

- `src/components/CnDataTable/CnDataTable.vue`, `src/components/CnIndexPage/CnIndexPage.vue` (the `rowIconTone`
  prop), `src/css/look-board-index.css`.
- No schema change (the page config is open).
