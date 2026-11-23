---
kind: code
---

# Proposal: board-folder-scope-outside-card

## Summary

DqAfdelingen (r26a, :8080 on nc-vue 2.135) shows two differences from its board once a department is picked:

- The heading "Vergunningen" and its line sit inside the list card. The board draws them above the card. In the board look, when a scope heading heads the list, the list area is unframed, and its table and footer carry the card.
- The Active line repeats the folder pane's filter as a raw chip ("group: zuiddrecht-vergunningen"). The selected folder already shows in the pane and in the heading. The folder pane's filter field no longer becomes a chip; other filters still do.

## Scope

- `src/components/CnIndexPage/CnIndexPage.vue` (`isFolderFilter`), `src/css/look-board-index.css`, tests. No schema change.
