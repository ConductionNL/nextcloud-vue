---
kind: code
---

# Proposal: settings-fields-lists

## Summary

CnSettingsFieldsSection could hold one value per field. Admin forms that store a list of choices, a key-to-value map, one key of a JSON setting, or a record picked by a scope value (a tenant) still had to be written by hand. pipelinq has six of them (menu modules, prospect provinces and legal forms, POS customer search fields, forecast exchange rates, VAT rates per class, portal tenant config).

- `checkboxes`: several choices from `options` in a fieldset named by the label; the value is a list in option order. `select` with `multiple: true` is the same as a multi-select. Saved as a list, or with `saveAs` `json` or `csv` as JSON or comma text, and read back from any of the three.
- `pairs`: key-to-value rows with add and remove buttons (`keyLabel`, `valueLabel`, `valueType: 'number'`, `addLabel`, `keyMaxLength`), saved as one object or as JSON text. Two rows with the same key are refused.
- `path: 'setting.key'`: the field edits one key inside a JSON-valued setting; a save sends the whole setting back with the section's keys set and the others kept.
- `scope: true`: the field's value fills `{key}` in the section's and fields' urls; a change reads the section again. A scope field is never saved and never makes the section dirty.

- An action whose answer has no sentence says `successText`, or `failureText` when `okPath` reads false, with `{name}` filled from the answer.

Nothing changes for a field that uses none of these.

## Scope

- `src/components/CnSettingsField/CnSettingsField.vue`, `src/components/CnSettingsFieldsSection/CnSettingsFieldsSection.vue`, their docs pages, `l10n/en.json`, `l10n/nl.json`, `tests/components/CnSettingsFieldsSectionLists.spec.js`.
