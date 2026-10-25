---
kind: code
---

# Proposal: board-settings-table-head-height

## Summary

DqInstellingen and DqVthInstellingen draw a settings table's head 42.5px. Live, a head grows to that height only when a head cell holds a tall enough control: Koppelingen read 42.5px, the VTH activity and fee tables 37.5px with the same 10px 12px padding (probe r26b), so their rows sat 5px high. In the board look a settings table's head cells are 42.5px high.

## Scope

- `src/css/look-board-index.css`, a css test. No schema change.
