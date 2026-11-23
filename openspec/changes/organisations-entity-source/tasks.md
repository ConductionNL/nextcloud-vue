# Tasks: organisations-entity-source

## 1. The source

- [x] 1.1 `useOrganisationStore`: `load()` and `fetchRecord(uuid)` against
      the two organisation endpoints, refusals kept by status.
- [x] 1.2 `organisations` in `indexSources.js` with rows and record keyed on
      the uuid, default columns, `showAdd: false`.
- [x] 1.3 `resolveRecordSource(name)`.

## 2. The detail page

- [x] 2.1 `CnDetailPage` `entitySource` prop: record source wins over the
      object store; Refresh and `cn:page:refresh` re-read; 403/404 not found.

## 3. Manifest and docs

- [x] 3.1 `organisations` in the schema's `entitySource` enum.
- [x] 3.2 CnIndexPage and CnDetailPage docs.
- [x] 3.3 Unit tests.
