---
kind: code
---

# Proposal: board-settings-plain-tables

## Summary

dossiq draws some admin tables as plain HTML tables (ZGW API mapping, StUF-ZKN endpoints and audit log, AWB term definitions). Under thematiq they read 15px with bold dark heads on a grey ground and 8px 6px cells (r29 DqBeheerGeavanceerd: 14 flags per table). In the board look a plain table in a settings card now reads as the board's settings tables: 14px, near-white head with muted 600 labels (through the theme's header tokens), 10px 12px cells, soft rules.

## Scope

- `src/css/look-board.css`, a css test. No schema change.
