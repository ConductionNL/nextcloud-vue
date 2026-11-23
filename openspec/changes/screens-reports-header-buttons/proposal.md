---
kind: code
---

# Proposal: screens-reports-header-buttons

## Summary

Board DcRapportages draws a "Downloaden" button and the buildiq square beside the reports page title. A reports page
had no header buttons to configure (screens-reports-page-board-look left them out for that reason), so decidiq's
Rapportages drew its title alone.

A reports page now takes `headerButtons` and `headerActions`, in the shape an index page uses: a button names a
`headerActions` entry by id (its `action`), and that entry says what the click does (a registry handler, `navigate` to
a route, a URL in a new tab, or `emit` only). Every click also emits `header-action`. Under the board look the buildiq
square sits between the secondary buttons and the primary one, as on the index header.

## Scope

- `src/components/CnReportsPage/CnReportsPage.vue`: the `headerButtons` and `headerActions` props, `headerButtonsRow`,
  `onHeaderButton`, the heading row.
- `src/css/look-board-reports.css`: the board's 40px buttons.
- Manifest schema 2.96.0: the `headerButtons` description names `type: "reports"`. The key already validated on any
  page; the bump records the new meaning.
- A reports page without `headerButtons` renders exactly as before, in both looks (no square, no extra wrapper).

## Not in this change

- The index-only actions (`add`, `export`, `import`, `refresh`, `actions-menu`): a reports page has no list for them.
