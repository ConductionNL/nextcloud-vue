---
kind: code
---

# Proposal: detail-endpoint-source

## Summary

An index page can list rows from an app's own endpoint (`entitySource: "endpoint"`), but the detail page of such a row
had to be an app component: pipelinq's cash register audit entry (KassakoppelingAuditDetail) and dossiq's StUF audit row.
The endpoint source now also reads one record, from `sourceConfig.url` with `{id}`, so the detail page is
`type: "detail"` with `entitySource: "endpoint"` and its sections and header actions are configuration.

## Scope

- `src/composables/indexSources.js`: the endpoint source gains `configure`, `loadRecord`, `record` and `recordError`.
- `src/components/CnDetailPage/CnDetailPage.vue`: a `sourceConfig` prop, handed to a record source that takes one.
- `docs/components/cn-detail-page.md`.
