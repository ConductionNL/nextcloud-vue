# Tasks: form-pickers-from-schema

## 1. Schema keys
- [x] Map `x-allow-create`, `x-fill-from`, `x-label-field`, `x-default`, `x-help` in `fieldsFromSchema`.
- [x] Resolve `group`, `group-multiselect`, `language`, `timezone` widgets; accept `format: nc-user`.

## 2. Select or create
- [x] Render `CnResourceSelect` for single and array references with `allowCreate`.
- [x] "Create" opens a nested `CnFormDialog` for the referenced schema, saves through the object store and selects the result.
- [x] `CnResourceSelect` `multiple` mode.

## 3. Related list create form
- [x] `CnObjectListWidget` passes `register`, seeds and locks the scoped parent.

## 4. Pickers
- [x] Group picker over the core autocomplete endpoint, `cloud/groups` fallback.
- [x] Language picker labelled through `Intl.DisplayNames`; time zone picker from `Intl.supportedValuesOf`.
- [x] `x-default: current-language` / `current-timezone` on create only.

## 5. Help
- [x] `x-help` always shows the (i) popover; checkbox and switch fields render `CnFieldHelper`.

## 6. Tests
- [x] `tests/utils/schemaPickers.spec.js`, `tests/utils/pickerOptions.spec.js`, `tests/utils/groupAutocomplete.spec.js`
- [x] `tests/components/CnFormDialogPickers.spec.js`, `tests/components/CnObjectListWidgetCreateRegister.spec.js`, `tests/components/CnResourceSelect.spec.js` (multiple)
