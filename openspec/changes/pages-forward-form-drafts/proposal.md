# Pages forward form drafts

## Why

`form-dialog-autosave` gave `CnFormDialog` a kept draft (`draftAppId`, `draftUserId`) and a "Save draft" button (`allowDraft`, `draftField`). The two pages that open most forms, `CnIndexPage` and `CnDetailPage`, forward none of these props, so a manifest app cannot reach them: dossiq row 3.14 (intermediate save of task forms, change `task-forms-keep-a-draft`) needs its case and task forms to keep a draft under dossiq's key, and its new-case form to offer "Save draft". Without the app key every app's draft of a schema called `case` shares one storage key.

## What changes

- `CnIndexPage` and `CnDetailPage` take `draftAppId`, `allowDraft` and `draftField` (manifest page config of the same names) and forward them to every `CnFormDialog` they open.
- "Save draft" is offered on a create form, and on an edit form only while the record is still a draft: saving a record that is in use as a draft would take it out of use.
- The manifest schema declares the three keys.

## Impact

- `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnDetailPage/CnDetailPage.vue`, `src/schemas/app-manifest-v2.schema.json`.
- Consumer: dossiq `task-forms-keep-a-draft`.
