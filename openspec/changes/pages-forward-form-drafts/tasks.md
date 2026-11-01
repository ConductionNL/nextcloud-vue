# Tasks: pages-forward-form-drafts

- [x] 1 `CnDetailPage`: props `draftAppId`, `allowDraft`, `draftField`; forwarded to the create, edit and source-verb forms (`allowDraft` on edit only while the record is a draft).
- [x] 2 `CnIndexPage`: the same props, forwarded to its form dialog (`allowDraft` only on create or on a draft record, never on a row edited outside the page's pair).
- [x] 3 `src/schemas/app-manifest-v2.schema.json`: the three page config keys.
- [x] 4 `tests/components/CnPagesForwardFormDrafts.spec.js`.
