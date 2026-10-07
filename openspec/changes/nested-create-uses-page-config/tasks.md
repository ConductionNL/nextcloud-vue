# Tasks: nested-create-uses-page-config

## 1. Find the page for a reference by id
- [x] `appCreateFor(register, refs)` matches on any of the given references; `openNestedCreate` loads the referenced schema when the reference alone matches no page and retries with its slug, id and uuid.

## 2. The page's form settings on the nested form
- [x] `nestedFormConfig(config)` maps `excludeFields`, `includeFields`, `fieldOverrides`, `formSize`, `formColumns`; the nested `CnFormDialog` binds them.
- [x] `nestedPrefillKey` puts the typed term in the label field, else `name`, `title` or `label`.

## 3. Tests
- [x] `tests/components/CnFormDialogPickers.spec.js`, fixture mirrors pipelinq's live contact and client schemas (`$ref: 28`), Clients page config and registry entries. 4 of the 5 new tests fail on the old code; the fifth guards the unchanged generic fallback.
