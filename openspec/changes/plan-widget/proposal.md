---
kind: code
---

# Proposal: plan-widget

## Summary

ARCH-AUDIT Decision-5 item (Ruben: build it generic, a record's planned steps). dossiq's CasePlanPanel renders the stages, tasks and milestones OpenRegister's case layer holds for a case, with the moves OpenRegister allows. Any app on OpenRegister cases has a plan. CnPlanWidget is that panel as the `plan` detail widget.

## Scope

- New `src/components/CnPlanWidget/` (with its row), `src/utils/planTree.js` (internal), exported component, registered as the `plan` detail-page catalog widget, in `DASHBOARD_CATALOG_WIDGET_KEYS`.
- Schema keys needed (no bump here): a `plan` widget type with `content` `{ emptyText? }`.
