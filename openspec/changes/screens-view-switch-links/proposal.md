---
kind: code
---

# Proposal: screens-view-switch-links

## Summary

The boards draw one view switch with table, cards, board and map. In the apps a board (kanban) or a map is often a
page of its own, so the list page could only draw that segment disabled ("not available on this list") or leave it
out. `viewSwitchLinks` makes such a segment a link to that page, in its place in the switch beside the in-place
segments.

## Scope

- `src/components/CnActionsBar/CnActionsBar.vue`: `viewModeLinks`, a link segment.
- `src/components/CnIndexPage/CnIndexPage.vue`: `viewSwitchLinks`, resolved to `{ href, to }`.
- `src/css/look-board-index.css`: the link segment's box.
- Manifest schema: `pages[].config.viewSwitchLinks`.
- Board look only. Without the key the switch is what it was.
