---
kind: code
---

# Proposal: retention-widget

## Summary

ARCH-AUDIT Decision-5 item (Ruben: build it generic). dossiq's CaseArchivalPanel shows a case's archival future from OpenRegister's `@self._retention`, with a recompute for archivists. Every app that keeps records on OpenRegister archives them. CnRetentionWidget is that panel as the `retention` detail widget.

## Scope

- New `src/components/CnRetentionWidget/`, exported, registered as the `retention` detail-page catalog widget, in `DASHBOARD_CATALOG_WIDGET_KEYS`.
- Schema keys needed (no bump here): a `retention` widget type with `content` `{ title?, subtitle?, statusField?, archivedValues?, archivistGroups?, recompute? }`.
