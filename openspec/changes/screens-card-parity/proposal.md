---
kind: code
depends_on: [screens-chrome-parity, screens-index-list-parity]
---

# Proposal: screens-card-parity

## Summary

The screens draw two kinds of cards on workplace pages (canon sections 3 and
10): record cards in the cards view of an index list (residents, cases,
tickets) and catalogue cards on store, integration and module pages. Both are
a white box with radius 12, a head row, a short facts list and one action at
the bottom, in a grid of `minmax(260px, 1fr)`.

The library draws `CnObjectCard` in `CnCardGrid` at `minmax(320px, 1fr)`,
with a hover lift, uppercase 11px metadata labels in an auto-fill grid, no
status pill and no footer action; `CnStorePage` draws its own card without an
icon, a status pill or an action.

Under `look: "board"` both take the screens' shape. Without it nothing
changes.

1. The card grid: `minmax(260px, 1fr)`, 16px gap, theme hooks for both.
2. The record card: head row with a leading avatar or icon, title link,
   sub line, status pill or row menu at the end; facts as a two-column list;
   one action at the bottom.
3. The cards view keeps the index toolbar and the footer of the table view.
4. The catalogue card: icon chip, title, kind and publisher, status pill,
   description, footer with version and one action.

## Reference screens

| Screen | Live board |
|---|---|
| `pipelinq/LijstKaarten` (record cards in an index) | https://identity.conduction.nl/screens/board?id=pipelinq/LijstKaarten |
| `pipelinq/PqStore` (catalogue cards) | https://identity.conduction.nl/screens/board?id=pipelinq/PqStore |
| `learniq/LqStore` (catalogue cards) | https://identity.conduction.nl/screens/board?id=learniq/LqStore |
| `pipelinq/PqIntegrations` (integration cards) | https://identity.conduction.nl/screens/board?id=pipelinq/PqIntegrations |

## Builds on

- `screens-chrome-parity`: the `look` switch.
- `screens-index-list-parity`: the toolbar and the footer the cards view
  shares with the table view.
- `manifest-card-index-component`: the card component a page may name. A
  custom card keeps its own look; this change styles the default card.
- The `data-display` spec ("CnObjectCard metadata slot override"): the slot
  keeps working and replaces the facts list.

## Consumers

Every app with a cards view or a store page. The look changes only where
`look: "board"` is set.

## Out of scope

- The citizen case card in Mijn (the Den Haag folder card): it is drawn by
  portaliq's site components, not by this library.
- Kanban cards: the second screen-parity pull request.
## Decided by the design owner (8 Oct)

- Card grids are 260px minimum, exposed as the theme token
  `--cn-card-grid-min` (default 260px). The `pipelinq/LijstKaarten` board
  (280px, 14px gap, white card) is being corrected to match; the spec does not
  change.

## Impact

Additive and scoped under `.cn-look-board`. Three new optional props on
`CnObjectCard` (`status`, `leading`, `footerAction`) and one optional manifest
key (`config.cardFields`). Minor version.
