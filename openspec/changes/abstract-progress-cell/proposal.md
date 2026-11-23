---
kind: code
---

# Proposal: abstract-progress-cell

## Summary

Ruben, 11 Oct 2026: pages are manifest configuration over abstract widgets.

PqLeads' Winkans column draws a bar with the percentage beside it, toned green, amber or red, and a "Verouderd 12
dagen" badge under a lead that has stood still. pipelinq draws it with an app cell component (`LeadWinChanceCell`)
registered through `cnCellWidgets`. A score or share column is common across the fleet (a case's progress, a budget's
use, a match score), so it becomes a built-in cell widget: `widget: "progress"`, configured with `widgetProps`.

## Scope

CnCellRenderer only (template, three computeds, CSS); docs; unit tests; harness e2e. Opt-in per column. No schema
change (column `widget` / `widgetProps` are open).
