---
kind: code
---

# Proposal: board-settings-desc-spacing

## Summary

The admin boards drawn from NcBeheerInstellingen (DqBeheerinstellingen, LrBeheerinstellingen, DqBeheerGeavanceerd) put a card's description 6px under its title and its content 16px under the description. The board look put them 4px and 14px apart (live probe r26b: title 272-294, description 298-319, content 333), so every settings card's first field sat 5px higher than drawn (Configuratie, Serviceaccount, Adviseringsbeheer: gapBelowTitle 39.1 vs 44.1). The description now gets `margin: -8px 0 2px` inside the card's 14px gap. This supersedes the 4px of board-settings-card-spacing.

## Scope

- `src/css/look-board.css`, `tests/css/lookBoardAdminSettings.spec.js`. No schema change.
