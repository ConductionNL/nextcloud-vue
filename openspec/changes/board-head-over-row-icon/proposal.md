---
kind: code
---

# Proposal: board-head-over-row-icon

## Summary

Board DqOrganisaties draws the leading icon inside the "Naam" cell, so the heading "Naam" starts over the icon (x 76). The
library draws the icon in its own column with a blank heading, so "Naam" started over the name (x 120). With compdiff #522,
this reads head.textInsetLeft 76 vs 120. The other boards agree with DqOrganisaties: a leading visual shares its column's
heading (DqContacten's avatar under "Naam"). Code, not board.

## Scope

- `src/css/look-board-index.css`: in the board look, the heading after the icon column drops its start padding, shows its
  overflow, and pulls its content back 32px over the blank icon heading.
- The headless probe on :8080 with the rules injected reads the label at 76, over the icon (76), and hit-tests visible.
  The head row stays 64px.
