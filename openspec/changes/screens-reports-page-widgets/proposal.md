---
kind: code
---

# Proposal: screens-reports-page-widgets

## Summary

Board DcRapportages shows, under the report cards, a section "Vergaderingen en efficiëntie". It has a "Hele
rapportage" link, four stat tiles with sub-lines, and a bar chart "Gemiddelde duur per maand". CnReportsPage had only
a description, categories and cards.

A reports page now takes `widgets` and `layout`, as a dashboard page does, and draws them as a dashboard grid under
the cards. The board's section is one `sections` widget: its card title and link are the widget's `title` and
`headerLink`, and inside it are the existing stat (`label`, `note`) and chart widgets, the chart under its own
heading.

## Scope

- `src/components/CnReportsPage/CnReportsPage.vue`: `widgets`, `layout`, an embedded CnDashboardPage (loaded on
  demand, without its header).
- No schema change: page `config` is open in the v2 manifest schema.
