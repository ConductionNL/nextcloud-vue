---
kind: code
---

# Proposal: detail-tabs-from

## Summary

Board DqAanbesteding draws a tender case with the tabs Inschrijvingen, Publicaties, Bestanden and Historie, while other case types keep their own tabs. Like `sideColumnFrom` for the side column, `tabsFrom` names a field path (read like a `visibleWhen` field, `@context.caseType.tabs`) whose list of tab ids picks the tabs of the page's `tabs` widgets and their order for the record. Without a list the declared tabs stay.

## Scope

- `src/components/CnDetailPage/CnDetailPage.vue`: `tabsFrom`, applied to the grid's widget definitions (`bodyGridWidgets`), never mutating the declared ones; edit mode shows every tab.
- Manifest: `config.tabsFrom` is a new detail-page key; the batch integration adds it to the schema.
