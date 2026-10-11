---
kind: code
---

# Proposal: screens-index-header-buttons-parity

## Summary

The index header buttons as the PqTickets, PqLeads and DqZaken boards draw
them (round6/pipelinq/library-gaps.md "Primary header button"):

1. The primary button reads "+ Nieuw verzoek": the `add` header button
   carries a plus. Live it shows the label only, because a manifest `add`
   button has no icon unless it names one.
2. Download (and the Actions menu) is a 40px button with a grey border on the
   main background, the primary button a primary fill without a border. Live,
   under the nldesign theme, Download has a blue (primary) border and the
   theme's 8px 16px padding: the theme styles every secondary and primary
   button with `!important`, which outranks the board stylesheet.

Behind the board look (`look: "board"`): an app without the key renders
exactly as today.

## Not built

- dossiq gap 7, the "Acties" menu next to Downloaden when the page has no
  header actions: the DqZaken board draws the button
  (`aria-haspopup="menu"`) but not the menu's content, and no other board or
  source file says what it holds. The menu stays absent when a page has no
  header actions until the board names its entries.
- The small square that overlaps the primary button's top right corner on
  the live PqTickets page: it could not be identified without a browser on
  the live instance (the app lanes own those).
