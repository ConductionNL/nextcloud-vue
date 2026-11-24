# Proposal: detail-header-row-from-record

## Why

dossiq's `case-type-declares-its-header-actions` lets a case type name the header row of its cases
(`headerActions`, in order) and the act drawn as the primary button (`primaryAction`). CnDetailPage
can already read the quick actions from the record (`quickActionsFrom`), but only from one path, and
it has no way to read the primary button from the record. A case type that declares the new keys
would be ignored, and one that only declares the older `quickActions` must keep working.

## What Changes

- `quickActionsFrom` also takes a list of paths, read in order; the first that names a declared
  header action wins. A single path behaves as before.
- `primaryActionFrom`: a field path whose value names the declared header action drawn as the
  record's primary button. Only an id of `headerActions` is taken, and only while that action's own
  `visibleWhen` shows it; otherwise the stage's primary action and `primaryAction` stay.
- Manifest schema 2.194.0 accepts both.

## Impact

- `CnDetailPage` (props, `stagePrimary`, `effectiveQuickActions`), the manifest schema, docs.
- Backward compatible: pages that set neither key render as before.
