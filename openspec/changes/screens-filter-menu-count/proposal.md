---
kind: code
---

# Proposal: screens-filter-menu-count

## Summary

Boards DqZaken and PqTickets draw the toolbar's Filter button with the number of active filters ("Filter 2"). The
index page has two Filter buttons: the sidebar toggle, which already carries the count, and the Filter menu
(`filterMenu` on a page without a filter sidebar), which did not. The menu button now carries the same badge. The
other two pieces of toolbar state the boards draw were checked and already follow state: the "Active:" chips with
"Clear all" show only while a filter is active, and the bulk band only while rows are selected.

## Scope

- `src/components/CnIndexPage/CnIndexPage.vue`: the count on the Filter menu button and in its accessible name.
- `src/css/look-board-index.css`: the badge, drawn after the label.
- No manifest schema change: `filterMenu` exists. Without active filters the button renders exactly as before.
