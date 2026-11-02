# Proposal: filter-strip-pill-flush

## Why

COMPDIFF pl8 measured PqWachtrij's channel strip after filter-strip-board-pills landed: the pills stand 11px apart where
the board draws 8px, and the active pill has a 1px edge the board does not draw. The server's
`button:not(.button-vue,[class^=vs__]):not(.app-navigation-entry-button)` rule (0,2,1) adds a 3px right margin that the
two-class pill rule (0,2,0) cannot take back.

Only pipelinq's queue uses `filterStrip`; no dossiq page does.

## What changes

- A three-class rule gives the pills no margin, so the strip's 8px gap is the only space between them.
- The active pill draws no edge.
