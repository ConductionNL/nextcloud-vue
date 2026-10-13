---
kind: code
---

# Proposal: screens-dashboard-widget-header

## Summary

A registry widget reports its own card header through the `header` event: `record-list` and `facts` send the header
link with `{total}` filled in, a note ("3 in totaal") and one action. A detail page draws it; a dashboard page dropped
the event, so a `record-list` card on a dashboard showed the link with the literal `{total}` and no note. The
dashboard page now listens too and draws the same three parts in the card header.

## Scope

- `src/components/CnDashboardPage/CnDashboardPage.vue`: `@header` on both registry render sites, the reported link,
  the note and the action in the card header.
- No manifest schema change: `headerLink` and `headerNote` are widget `content`, which is free-form.
- A widget that reports nothing renders exactly as before.
