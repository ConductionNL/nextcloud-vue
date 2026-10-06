# form-pickers-from-schema: pickers and select-or-create from schema keys

## Why

Ruben reviewed pipelinq on 2026-10-06. Several create forms asked for raw values
where a person expects a list:

- Create contact and create lead cannot create a missing client inline (D1, D7).
  `CnFormDialog` documents `x-allow-create`, but `fieldsFromSchema` never read it,
  so the select-or-create branch never rendered. `x-fill-from` had the same gap.
- A lead's product line asked for a product uuid (D9). `CnObjectListWidget` opened
  its create form without `register`, so every `$ref` field degraded to text.
- Language, time zone and Nextcloud group fields were free text (D2, D3, D8).
- The (i) help only appeared for descriptions over 120 characters, and never on a
  toggle such as "Is master record" (B2).

## What changes

1. `fieldsFromSchema` maps `x-allow-create` to `field.allowCreate`, `x-fill-from`
   to `field.fillFrom`, `x-label-field` to `reference.labelField`, `x-default` to
   `field.defaultToken` and `x-help` to `field.descriptionLong`.
2. Choosing "Create" on a select-or-create reference opens the referenced schema's
   own form on top (nested `CnFormDialog`, same register), prefilled with the
   typed term. Saving it selects the new object. Array references get the same
   behaviour through a new `multiple` mode on `CnResourceSelect`.
3. `CnObjectListWidget` passes its register to the create form and seeds and locks
   the parent the list is scoped to.
4. New pickers: Nextcloud group (`format: nc-group` or `referenceType:
   nextcloud-group`, array for several), language (`format: language`) and time
   zone (`format: timezone`). `format: nc-user` joins `user` and `username`.
   `x-default: current-language` and `x-default: current-timezone` prefill a new
   object.
5. `x-help` always shows the (i) popover. Checkbox and switch fields show their
   helper line and (i) too.

## Impact

- `src/utils/schema.js`, `src/utils/pickerOptions.js` (new),
  `src/utils/groupAutocomplete.js` (new)
- `src/components/CnFormDialog/CnFormDialog.vue`,
  `src/components/CnResourceSelect/CnResourceSelect.vue`,
  `src/components/CnObjectListWidget/CnObjectListWidget.vue`,
  `src/components/CnFieldHelper/CnFieldHelper.vue`
- Backwards compatible: every new key is opt-in. A `$ref` without
  `x-allow-create` keeps the plain select.
