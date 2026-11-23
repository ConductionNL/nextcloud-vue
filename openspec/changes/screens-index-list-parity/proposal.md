---
kind: code
depends_on: [screens-chrome-parity]
---

# Proposal: screens-index-list-parity

## Summary

On 8 Oct Ruben decided that every index list on the screens uses the DqZaken
setup (canon section 3, after `audit/lijst-vergelijking.html`). The library's
index page draws the same parts in a different shape: the toolbar is a
tinted band, the saved views are a menu, the search is a pill, the view
switch is a labelled pill with a sliding thumb, the selection strip lives
inside the toolbar, the table has a shadow and grey header, and the
pagination sits under the card with First, Last and a page-size select.

Under `look: "board"` (from `screens-chrome-parity`) the index page takes the
DqZaken setup. Without it nothing changes.

1. The header block: title, count line, and the button order Download,
   Actions, buildiq square, primary.
2. The toolbar has no band: saved-view chips, Save view, Filter with a count,
   and the view switch on row 1; search and active filter chips on row 2.
3. Saved-view chips with a count badge, the selected one filled.
4. The view switch: icon-only segments, fixed order table, cards, board, map.
5. The bulk band is its own row between the toolbar and the table.
6. The table is a white card with the board header, rows and a row menu.
7. The footer is inside the card: count text left, numbered pages right.

## Reference screens

| Screen | Live board |
|---|---|
| `dossiq/DqZaken` (the canon list) | https://identity.conduction.nl/screens/board?id=dossiq/DqZaken |
| `pipelinq/PqTickets` | https://identity.conduction.nl/screens/board?id=pipelinq/PqTickets |
| `pipelinq/PqTicketsSelectie` (selection and bulk band) | https://identity.conduction.nl/screens/board?id=pipelinq/PqTicketsSelectie |
| `decidiq/DcVoorstellen` | https://identity.conduction.nl/screens/board?id=decidiq/DcVoorstellen |
| `werkplek/Lijstkop` (header, toolbar and filters as a part) | https://identity.conduction.nl/screens/board?id=werkplek/Lijstkop |

## Builds on

- `screens-chrome-parity`: the `look` switch, the page frame, the header
  button and the buildiq square.
- `zuiddrecht-pixel-gaps-3`: `config.showCount`, `config.showTitleIcon` and
  `config.headerButtons`. This change adds the `actions-menu` button kind and
  the button order; the keys are not new.
- `zuiddrecht-pixel-gaps`: the column `secondary` line, used for the
  identifier under the title.
- `workplace-dashboard-primitives` ("Counts on filters and views"): the
  counts the chips show. This change draws them; it does not count.
- `index-bulk-edit-and-transitions` and `working-list-row-actions`: what the
  bulk band and the row menu do. This change is their look only.
- `view-presentation-picker`, `index-calendar-view-mode`,
  `cnindexpage-map-viewmode`: the modes the switch offers.
- `layout-phone-width`: the phone layout of the same toolbar. Below 600px
  the phone rules of that change win over the board rules here.

## Consumers

All five render index pages; the look changes only where `look: "board"` is
set (dossiq, pipelinq and decidiq first).

## Out of scope

- The empty state inside the card (second screen-parity pull request).
- Folder tabs above the toolbar on an index with lenses: the tab look is in
  `screens-detail-page-parity`, the lenses in `working-list-row-actions`.
- The kanban and map views below the toolbar (second pull request for
  kanban; the map view keeps its current look).

## Impact

Additive and scoped under `.cn-look-board`; one new header button kind and
two new optional props (`CnPagination.variant`, `CnActionsBar.layout`). Minor
version.
