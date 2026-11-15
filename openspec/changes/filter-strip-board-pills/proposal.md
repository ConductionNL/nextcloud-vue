# Proposal: filter-strip-board-pills

## Why

COMPDIFF pl6 measured PqWachtrij's channel strip ("Telefoon", "E-mail", "Balie") under the list as tonal 8px buttons at
15px bold, where the board draws it under the quick filters as outlined 17px pills at 14px/600 with the active one in
ink. Two causes in nc-vue:

- On a page with a side panel the index grid names an area for every header row, the toolbar and the list, but not for
  the filter strip, so it fell into the trailing `extra` row under the list.
- The pill rules are one class (0,1,0); the server's `button:not(.button-vue, ...)` rule (0,1,1) outranks them and
  draws the plain tonal button.

Only pipelinq's queue uses `filterStrip`; no dossiq page does.

## What changes

- The side-panel grid gets a `strip` row between the toolbar and the list (both widths); an empty row is 0px.
- The pill rules carry the page class, with a hover rule, so they outrank the server's button rule.
