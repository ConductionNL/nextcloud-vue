---
kind: code
---

# Proposal: settings-table-link-ink

## Summary

DqInstellingen draws each connection's name in the text ink. Since the name opens the row's settings card it is a link, and on an admin page Nextcloud's settings styles drew it in link blue. In the board look a linked cell in a settings card's table now reads in `--color-main-text`, underlined, as the index tables draw their linked titles.

## Scope

- `src/css/look-board.css`, `tests/css/lookBoardSettingsTableLinkInk.spec.js`. No schema change.
