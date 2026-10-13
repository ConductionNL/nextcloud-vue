---
kind: code
---

# Proposal: screens-index-header-actions-menu

## Summary

Boards DqZaken, DqZaaktypen and DcVergaderingen draw an "Acties" menu beside the header buttons of an index page. When
a page shows header buttons, the actions bar drops its own Actions menu, and the header's `actions-menu` button listed
only the page's header actions. So an app that took the board header lost its Documentation link and had to turn
Import and Refresh into buttons, and copy and delete selected had no place in the menu (decidiq's held draft #1708).

The `actions-menu` button now takes `items`: the menu's entries by name, in order. A header action with
`type: "navigate"` and a `target` URL is drawn as a link.

## Scope

- `src/components/CnIndexPage/CnIndexPage.vue`: `headerMenuEntries`, the menu's template, link actions.
- Manifest schema 2.90.0: `headerButtons[].items`.
- Without `items` the menu is what it was. Without the board header nothing changes.
