---
kind: code
---

# Proposal: screens-segmented-tabs-wrap

## Summary

#1529 made the board look's tab strip wrap instead of scrolling sideways, but only the `line` strip. A tabs widget
with `variant: "segmented"` kept its scroller: dossiq's case page drew 13 segments as a 1669px strip in a 686px card,
measured on :8080. Under the board look the segmented strip now wraps too, so no tab strip scrolls sideways.

## Scope

- `src/css/look-board-detail.css` only, under the strip's own look class. The Nextcloud look is unchanged.
