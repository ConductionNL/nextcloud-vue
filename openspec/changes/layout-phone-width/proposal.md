---
kind: code
depends_on: []
---

# Proposal: layout-phone-width

## Why

People open Conduction apps on a phone: an employee requesting leave on
the train, a game master checking in players at the gate, an inspector
in the street. Most pages they reach are drawn by this library, so
whether they work at phone width is decided here, not in the app.

At 360 pixels wide today:

- `CnDataTable` stays a table. A list with six columns scrolls sideways,
  and the name column scrolls out of view.
- `CnDashboardPage` keeps its desktop grid. `CnDashboardGrid` only
  reflows when a host passes `columnOpts`, and `CnDashboardPage` does not
  pass it.
- The index page's action bar and sidebar keep their desktop layout.
- `CnFormDialog` stacks its two-column form below 700 pixels, which is
  the one piece that already adapts.

WCAG 2.1 success criterion 1.4.10 (Reflow, level AA) asks that content
works at 320 CSS pixels without scrolling in two directions. The fleet
commits to AA (hydra ADR-010).

## Rows

No gap row in this lane's list names this. Two sibling changes wait on
it:

- humaniq `self-service-mobile`: "nextcloud-vue: the phone-width layout
  of `CnDashboardPage`, `CnIndexPage` and the form dialog" (cross-app
  dependencies), for humaniq matrix row `ess-mobile`.
- larpinq `admin-phone-friendly-pages`, REQ-APF-001: the Check-in tab,
  the character page, the Events index and the Dashboard "SHALL work at
  360 pixels wide without horizontal page scrolling, with tables shown
  as stacked rows", and "Pages rendered by `@conduction/nextcloud-vue`
  ... get their phone behaviour from that library; overflow found there
  is reported to nextcloud-vue."

The buildiq matrix row `ux-wcag` (deferred in this lane, no demand) is
partly served by this change as well; its missing half is buildiq's
in-builder check.

## What changes

- `CnDataTable` shows each row as a stacked card, label and value, when
  its container is narrower than a breakpoint, keeping selection, row
  actions and row click.
- `CnDashboardPage` reflows to one column at phone width by default.
- The index page's action bar folds its buttons into one menu and the
  sidebar opens as a full-width panel at phone width.
- `CnFormDialog` opens full screen at phone width with one column of
  fields.
- `CnDetailPage` stacks its grid and tabs without sideways scrolling.
- A Playwright lane checks the four page types at 360 pixels for
  horizontal scroll.

## Affected projects

- `nextcloud-vue`: `CnDataTable`, `CnIndexPage`, `CnActionsBar`,
  `CnIndexSidebar`, `CnDashboardPage`, `CnDashboardGrid`, `CnFormDialog`,
  `CnDetailPage`, `src/css/`.
- Consumers: every app. humaniq and larpinq first.

## Backward compatibility

Nothing changes above the breakpoint. A page can keep the table at any
width with `config.stackOnNarrow: false`, for the rare list whose columns
must stay aligned. A dashboard that already passes `columnOpts` keeps its
own.

## Out of scope

- An installable web app, offline use and push. humaniq and buildiq
  specify those in their own changes.
- Touch gestures such as swipe actions on rows.
