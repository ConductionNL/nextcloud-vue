---
kind: code
---

# Proposal: graph-canvas-check-strip

## Summary

Board DqFlow draws above the canvas "Controle: 1 fout, 1 waarschuwing." with a line per finding. CnGraphCanvas had no place for a check's findings.

## Scope

- `src/components/CnGraphCanvas/CnGraphCanvas.vue`, strings, `tests/components/CnGraphCanvasIssues.spec.js`.

## Out of scope

- The server side and the app's manifest; this is the library half.
