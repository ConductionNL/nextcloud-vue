---
kind: code
depends_on: [screens-index-list-parity, screens-index-toolbar-parity]
---

# Proposal: screens-view-switch-parity

## Summary

Every index board (PqTickets, PqLeads, PtPortals, DqZaken) draws the view
switch with four segments: table, cards, board, map. Live pages show two,
because the library offers a segment only when the page can open that mode
(a board needs a status field, a map needs `mapConfig`), and a manifest has no
way to draw the others (pipelinq "View switch", portaliq gap 5).

This change adds `config.viewSwitch`: the segments the switch draws. A listed
mode the page can open is an ordinary segment; one it cannot is drawn
disabled, named "<mode>: not available on this list", and does nothing. The
segments also take the boards' 18px icons (plain bullets for the table) and
the group takes the boards' name, "Weergave" ("View mode").

## Reference screens

| Screen | Live board |
|---|---|
| `pipelinq/PqTickets` | https://identity.conduction.nl/screens/board?id=pipelinq/PqTickets |
| `portaliq/PtPortals` | https://identity.conduction.nl/screens/board?id=portaliq/PtPortals |
| `dossiq/DqZaken` | https://identity.conduction.nl/screens/board?id=dossiq/DqZaken |

## Builds on

`screens-index-list-parity` (the four-segment switch and its order) and
`screens-index-toolbar-parity` (the Filter + switch unit, the "View mode"
catalogue entry). This branch stacks on the latter: merge that PR first.

## Out of scope

Making the board or map views work on a page that lacks the data: the page
still needs a `board` config or `mapConfig` for that. The disabled segment is
the board's drawing, and the honest state of the page.

## Impact

Additive: one manifest key (schema 2.78.0), one optional `CnActionsBar` prop
(`disabledViewModes`). The existing spec named the group "View"; the boards
name it "Weergave", so that requirement is amended to "View mode".
