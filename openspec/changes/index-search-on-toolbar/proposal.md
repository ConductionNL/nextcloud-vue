---
kind: code
---

# Proposal: index-search-on-toolbar

## Summary

On DqTeamwachtrij the list column sits beside a side panel, and BLD-Dq-B wants the search field on the toolbar row with the Filter button and the view switch rather than opening a second row. `config.searchPlacement: "toolbar"` puts it there under the board look; the default keeps it at the start of row 2.

## Scope

- `src/components/CnActionsBar/CnActionsBar.vue`: `searchPlacement`; the field moves to row 1.
- `src/components/CnIndexPage/CnIndexPage.vue`: `searchPlacement`, passed on.
- `src/css/look-board-index.css`: the field's share of row 1, under `.cn-look-board`.
- Manifest: `searchPlacement` is a new index config key (`""` | `"toolbar"`); the batch integration adds it to the schema.
