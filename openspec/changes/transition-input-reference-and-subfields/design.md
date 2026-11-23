# Design: transition-input-reference-and-subfields

Read on nextcloud-vue development `3eefb4f00`
(`src/dialogs/CnTransitionInputDialog.vue`,
`src/components/CnResourceSelect/CnResourceSelect.vue`,
`src/utils/schema.js:295-300,833`) and learniq development
(`learner-merge-page-action`, `attendance-flag-report-actions`, schema
`lib/Settings/learniq_register.json`) on 7 October 2026. learniq's boards
draw neither dialog (`LqLeerling` has the Meer menu the merge sits under);
the dialog keeps its current layout, one row per input.

## D1. Reference inputs reuse CnResourceSelect

`fieldsFromSchema` already turns `$ref` into `reference: {schema, multiple,
register?, labelField?}` (`schema.js:833`), and `CnFormDialog` renders that
with `CnResourceSelect`. The dialog does the same, so a picker looks and
searches the same in a form and in a transition. The value sent is the
picked object's uuid, the type the property declares.

## D2. Narrowing the candidates

`picker.filter` is an object of field values passed to the list query
(`{lifecycle: "active"}`). `picker.excludeSelf: true` drops the record the
transition runs on from the options. `picker.labelField` overrides the shown
label. learniq's merge also wants personal number and group shown; that is
`CnResourceSelect`'s existing option label, extended by `labelField` only.
The guard on the server still decides; the picker makes the right choice
easy (learniq D2).

## D3. Sub-fields of an object input

The transition allowlist checks top-level keys (`InvalidTransitionInputException`),
so the dialog never sends a dotted key. For an object input it renders
`fieldsFromSchema(property)` limited to `fields` when given, collects the
sub-values, and sends `data: {<input>: {...current, ...typed}}`, where
`current` is the record's present value of that object (or `{}`). A
required sub-field is one the input declares in `fields` and the
sub-schema lists in its `required`, or the whole input is required and the
sub-field is the only one asked. Rejected: dotted inputs
(`{field: "municipalityFeedback.masRoute"}`), because the server allowlist
would refuse the key and the declaration lives on the server.

## D4. Where the hints live

For a transition list declared in the manifest (`CnLifecycleActions`
`transitions` prop, learniq's merge), `picker` and `fields` sit on the input
entry. For transitions read from OpenRegister's `/available-actions`
(learniq's attendance flag), the manifest adds
`config.lifecycleActions.inputs: {<action>: [{field, picker?, fields?}]}`,
merged onto the server's declared inputs by `field`. A hint for a field the
server does not declare is ignored with a console warning; the hints never
add an input.

## D5. Refusals

A 400 naming the object input marks the whole group; the #1211 marking rules
apply per sub-field when the message names `<input>.<sub>`.

## Files

- `src/dialogs/CnTransitionInputDialog.vue`, `CnTransitionInputDialog.md`
- `src/components/CnLifecycleActions/CnLifecycleActions.vue`
- `src/components/CnDetailPage/CnDetailPage.vue`, `src/schemas/app-manifest-v2.schema.json`
- `src/components/CnResourceSelect/CnResourceSelect.vue`
- `tests/dialogs/CnTransitionInputDialogReference.spec.js`, `tests/dialogs/CnTransitionInputDialogSubfields.spec.js`, `tests/components/CnResourceSelectFilter.spec.js`
