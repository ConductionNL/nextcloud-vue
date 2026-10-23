---
kind: code
---

# Proposal: facts-link-opens-sidebar-tab

## Summary

Boards DqContact and DqOrganisatie end the side "Historie" card with "Historie bekijken", a link with a history icon
that shows the record's audit trail. The audit trail lives in the page's object sidebar (a tab `audit`); a facts
card's foot link could only go to a route or a URL.

A facts `link` may now name a sidebar tab: `{ label, icon?, sidebarTab }`. It draws as a link-styled button that opens
the object sidebar on that tab through the `objectSidebarState` channel, the same way CnTimelineManage's
`auditTrailLink` does. On a page without an object sidebar the link is not drawn.

## Scope

- `src/components/CnFactsWidget/CnFactsWidget.vue`: `link.sidebarTab`, `openSidebarTab`, a button variant of the
  foot link.
- No schema change (widget `content` is open).
