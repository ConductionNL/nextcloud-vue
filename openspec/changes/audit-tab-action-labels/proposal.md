# Proposal: audit-tab-action-labels

## Why

The sidebar's history tab (`CnAuditTrailTab`, the `audit` sidebar widget) shows each entry's action as recorded
(`mcp.search`), while the History card words it through `actionLabels`. An app that wants its detail pages' history tab
to read "Assistant: stackiq.module.search" for assistant actions has no way to say so.

## What changes

- `CnAuditTrailTab` takes `actionLabels`, the same map as the History card, read through `actionLabelFor` and
  `fillAuditLabel` (`src/utils/auditLabels.js`), including `.*` wildcards and the `{toolId}` token. A row reads the
  label; an action without one shows as recorded, and the expanded details keep the recorded action.
