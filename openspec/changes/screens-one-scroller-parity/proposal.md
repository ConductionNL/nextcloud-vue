---
kind: code
depends_on: [screens-chrome-parity]
---

# Proposal: screens-one-scroller-parity

## Summary

Ruben, 11 Oct 2026, on dossiq Mijn werk and the launchpad dashboard, for every
app: no scrollbars inside the page, one vertical scrollbar at the right edge
of the window, and content grids that span the whole content area and shrink
only when the sidebar opens.

Measured on :8080 (dossiq, pipelinq, portaliq at 1440 and 1920 wide), three
causes, all in the board look of this library:

1. `--cn-board-content-max-width: 1240px` caps every board page frame. At 1920
   wide the content stopped at x=1504, with 416px of dead space to its right,
   whether or not the sidebar was open.
2. `CnDashboardPage` scrolls itself (`height: 100%; overflow-y: auto`), so on a
   dashboard the capped page was the scroller and its scrollbar sat beside the
   content, inset from the window edge, inside `NcAppContent`'s own scroller.
3. `NcAppNavigation` gives the region above the list (the primary action,
   "Nieuwe zaak") `overflow-y: scroll`: an always-on track with arrow buttons
   on classic scrollbars, with nothing to scroll. The list itself
   (`overflow-y: auto`) drew a second bar whenever the menu was taller than the
   window (pipelinq: 1084px of menu in 610px).

The sidebar already behaves as asked: `NcAppSidebar` sits beside
`NcAppContent`, which shrinks when it opens (1176px to 787px on a pipelinq
lead at 1440) and reserves nothing while it is closed.

## Change

Under the board look only: the width cap becomes `none`, a dashboard page
grows with its widgets and lets `NcAppContent` scroll it, and the navigation
draws no scrollbar of its own (the region above the list takes its content's
height; a menu taller than the window still scrolls by wheel, touch and focus).

## Out of scope

- A widget whose content is taller than its grid cell still scrolls inside the
  widget (`cn-widget-wrapper__content`); that is the page's `gridHeight`, owned
  by the app manifest.
- `CnDetailPage`'s `maxWidth` prop (default 1800px, an inline style) is left
  alone: it only engages beyond a 2064px window, and an app sets it.
- Apps without `look: "board"` render exactly as before.
