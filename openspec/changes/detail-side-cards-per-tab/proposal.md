---
kind: code
---

# Proposal: detail-side-cards-per-tab

## Summary

Board DqZaaktypeVelden shows "Keuzelijst: Soort bouwwerk" and "Moedertype" beside the Velden tab; other tabs show other side cards. CnDetailPage's side column was one list for the whole page. The body's `tabs` widget now reports the open tab to the page, and a side entry with `tabs` shows only while one of those tabs is open.

## Scope

- `src/components/CnTabsWidget/CnTabsWidget.vue`: reports the open tab through the injected `cnDetailReportTab`.
- `src/components/CnDetailPage/CnDetailPage.vue`: provides it, keeps `activeBodyTab`, and filters side entries by `tabs`.
- Manifest: `tabs` on a side column entry (a widget definition key); the batch integration adds it to the schema.
