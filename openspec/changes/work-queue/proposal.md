---
kind: code
---

# Proposal: work-queue

## Summary

ARCH-AUDIT Decision-5 item (Ruben: build it generic, a mixed work-item queue). dossiq's PersonalQueueView lists everything waiting on the reader in groups its server declares (tasks, consultations, mentions, calendar, covered work), names unreadable sources, and lets a group be hidden until tomorrow. pipelinq's queue has the same shape. CnWorkQueue is that queue, with the sources and the groups left to the server.

## Scope

- New `src/components/CnWorkQueue/`, exported, also the `work-queue` catalog widget, in `DASHBOARD_CATALOG_WIDGET_KEYS`.
- Schema keys needed (no bump here): a `work-queue` widget type with `content` `{ source, hide?, show?, itemHref?, waitingParties?, emptyText? }`.
