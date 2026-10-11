---
kind: code
---

# Proposal: abstract-facts-widget

## Summary

Ruben, 11 Oct 2026: pages should come down to manifest configuration over
abstract, configurable widgets, and a pattern that appears in two or more apps
gets ONE library widget that each app only configures.

The side "facts" card is such a pattern. The screens draw it on almost every
detail page: PtPortal (Domein en certificaat, Thema, Status en laatste
publicatie), DqTaak (Taak, Zaak), the lead and ticket side cards in pipelinq.
Each app drew it with its own component: portaliq `PortalSummaryCard` (three
`kind`s hard-coded in one file), dossiq `TaskCaseCard` and the facts block of
`TaskDetailView`. Every one of them is the same thing: label/value rows (a
two-column grid, the label muted), sometimes a bold title that links, muted
meta lines that join a few fields with " · ", a status pill and one link.

This change adds the `facts` widget type (CnFactsWidget): the fields to show
are configuration (dot-paths, labels, formats, value maps), and the object is
either the current detail-page object or one object named by a `source`
(register/schema/id with the shared tokens, or a url with tokens inside it).

## Scope

- New `facts` widget, registered in the dashboard catalog, content-only (the
  detail page gives it the titled card; a tab panel renders it bare).
- Docs page, unit tests, a harness e2e that measures the row grid.
- No manifest schema change: widget `type` and `content` are open in the v2
  schema on detail and dashboard pages.

## Out of scope

- Migrating the app components. Lane A writes the exact manifest per app
  (round6/A/migrate-<app>.md); the app lanes apply it, one PR per component.
- A colour swatch format (PtPortal Thema card) and person avatars in a row.
