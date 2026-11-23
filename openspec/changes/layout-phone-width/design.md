# Design: layout-phone-width

Read at nextcloud-vue development `c8aa85863`.

## What is there

- No `@media` rule in `CnDataTable`, `CnIndexPage`, `CnActionsBar`,
  `CnDashboardPage` or `CnDashboardGrid`.
- `CnFormDialog` stacks `.cn-form-dialog__form--two-column` below 700 px
  (`src/components/CnFormDialog/CnFormDialog.vue:3369`).
- `src/css/detail-page.css:329` pads less and stacks the header below
  768 px. `src/css/grid.css:35`, `:47` step the widget grid down at 900 and
  600 px.
- `CnDashboardGrid` reflows only when given `columnOpts`
  (`src/components/CnDashboardGrid/CnDashboardGrid.vue:191`, default
  `null`); `getDashboardColumnOpts()` builds one
  (`src/utils/dashboardPlacement.js`), and `CnDashboardPage` passes none.

## Decisions

### D1. The container decides, not the viewport

A list in a split view or beside an open sidebar is narrow on a wide
screen. The table and the index page react to their own width, through
CSS container queries (`container-type: inline-size` on the page body),
with a `ResizeObserver` fallback class for the few engines without
them. The breakpoint is 600 px of container width.

### D2. A narrow table is a list of cards

Below the breakpoint `CnDataTable` renders each row as a card: the first
column (or the page's `titleField`) as the heading, the next visible
columns as label and value pairs, the checkbox and the row actions in
the card's header. Row click and keyboard focus move with the card. The
markup stays one list with one item per row, so a screen reader reads
the same rows in the same order.

Rejected: horizontal scroll with a sticky first column. It is what the
reflow criterion exists to prevent, and on a phone the second column is
still off screen.

### D3. The dashboard reflows by default

`CnDashboardPage` passes `getDashboardColumnOpts()` unless the page
supplies `columnOpts` or sets `config.responsive: false`. At phone width
that is one column in reading order: top to bottom, then left to right,
the order the existing sort in `grid-widget-system` already defines.

### D4. The action bar folds, the sidebar covers

Below the breakpoint `CnActionsBar` keeps Add and the search field and
moves every other button into one Actions menu. `CnIndexSidebar` opens as
a full-width panel with a close button instead of beside the list.

### D5. Forms are full screen

At phone width `CnFormDialog` asks `NcDialog` for its full size and
keeps one column. The footer with Save stays in view while the fields
scroll.

### D6. A lane that can see layout

jsdom computes no layout, so this is checked in Playwright on the
harness: the index page, a detail page, a dashboard and an open form
dialog at 360 by 740, each asserting
`document.scrollingElement.scrollWidth <= clientWidth` and that the first
row's heading is visible. It joins the e2e job already required on
`development`.

## Files

- `src/components/CnDataTable/CnDataTable.vue`, `src/css/index-page.css`:
  the card rendering and the container query.
- `src/components/CnActionsBar/CnActionsBar.vue`,
  `src/components/CnIndexSidebar/CnIndexSidebar.vue`.
- `src/components/CnDashboardPage/CnDashboardPage.vue`.
- `src/components/CnFormDialog/CnFormDialog.vue`.
- `src/css/detail-page.css`.
- `e2e/phone-width.e2e.js`.

## Theming

Cards reuse the row colours: `--color-main-background`, hover
`--color-background-hover`, and a `--color-border` separator.
