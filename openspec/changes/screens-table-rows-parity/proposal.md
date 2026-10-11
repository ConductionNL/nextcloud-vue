---
kind: code
---

# Proposal: screens-table-rows-parity

## Summary

Two differences between the board look's table rows and the boards, found by
the pipelinq lane in round 6 (round6/pipelinq/library-gaps.md, "Row title"
and "Row menu"):

1. The boards draw the row title in two ways. DqZaken and most other boards
   underline the title (a 15px weight 600 link) with a muted secondary line
   that is not underlined. The PqTickets, PqLeads, other Pq boards and the Oc
   boards draw the title as bold 15px text without an underline, over a 13px
   muted secondary line. Live, every board-look table underlines the title,
   and the underline set on the cell also reaches the secondary line, so it
   reads as a second link.
2. The row menu is a 34px square with three dots and a grey border on every
   board. Live, under the nldesign theme, it is a 64px wide button with a
   blue (primary) border: the theme styles every secondary button with
   `!important` padding, `min-width: max-content` and border colour, which
   outranks the board stylesheet.

This change:

1. Adds `rowTitle` (`link`, the default, or `plain`) to CnDataTable,
   CnIndexPage and the index page config, for the boards that draw a plain
   title.
2. Keeps the title underline off the secondary line in the default `link`
   style.
3. Gives the row menu's board values `!important`, so a theme cannot widen or
   recolour it.

All of it is behind the board look (`look: "board"`): an app without the key
renders exactly as today.

## Out of scope

- The table card width (pipelinq "Table card width"): fixed in #1415.
- The header buttons (plus icon, "Acties" menu): a separate change.
