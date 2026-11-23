---
kind: code
---

# Proposal: dq-abstract-forms

## Summary

DQ-ABSTRACT lane L5. dossiq built bulk acts, type field filters, a party form field, two template pickers, a file-set table, a role picker and a rebind field as app components. Each is generic, so each becomes library behaviour that dossiq declares in its manifest or mounts with its own wording. keepiq's BulkRunPanel is the second consumer of the bulk report.

## Scope

- New: CnBulkJobProgress, CnSelectionScope, CnRelatedFieldFilters, CnTemplateSelect (exported, documented).
- Grown: CnFilterBar (`range`, `dateRange`, `showSearch`), CnIndexPage (`relatedFieldFilters`), CnFormDialog (`party` and `resource` widgets), CnResourceSelect (`scope`, `failedText`), CnFieldListWidget (dialog row actions, `inline` placement, `when` operators, `code` columns), CnSettingsField (`date`, `datetime-local`, `email`, `url`), CnPartyPicker (translated `secondary`).
- No schema change: page config and field overrides already admit the new keys.
