---
kind: code
---

# Proposal: screens-index-header-menu-headings

## Summary

Boards DcVergaderingen and DcBesluiten group the entries of the "Acties" menu beside the header buttons: a "Ga naar"
heading over the navigation entries, a rule, Importeren, a rule, a "Selectie" heading over the selection entries, a
rule, then Vernieuwen and Documentatie. The `actions-menu` button's `items` (screens-index-header-actions-menu) could
only name entries, so the menu could not draw those groups.

`items` now also takes `{ "heading": "<i18n key>" }` (a group heading) and `"separator"` (a rule). The app decides the
groups; the library only drops a mark that no entry follows.

## Scope

- `src/components/CnIndexPage/CnIndexPage.vue`: `headerMenuEntries`, `groupMenuEntries`, the menu's template.
- `src/css/index-page.css`: the heading's look (12px bold capitals, muted).
- Manifest schema 2.93.0: `headerButtons[].items` entries may be `{ heading }`; `uniqueItems` is dropped, because a
  menu has more than one `separator`. Duplicate entry names were already drawn once.
- Plain string items render as before. Without the board header nothing changes.
