# review-round-two: pickers from overrides, exact fkResolve slugs, app create dialogs from a picker

## Why

pipelinq adopted the form pickers from `form-pickers-from-schema` and hit four gaps
(Ruben's pipelinq review, round two, 2026-10-06):

- R1. OpenRegister refuses formats it does not know (`nc-group`, `language`,
  `timezone`) at import. pipelinq therefore declares those pickers as manifest
  `fieldOverrides.<key>.widget`. The language and time zone widgets already worked
  that way, but a group override rendered nothing useful and an override could not
  carry `x-default`.
- R2. The `fkResolve` cell kebab-cased a camelCase schema slug (`productCategory`
  became `product-category`) and every lookup 404ed. pipelinq worked around it with
  a lowercase slug.
- R3. Creating a client or contact from a picker (`x-allow-create`) opened the
  generic form and failed with a 400: those schemas need the app's own contact-first
  create dialog.
- R4. Text column header filters match on equals because OpenRegister had no
  contains operator.

## What changes

1. `fieldsFromSchema` treats an override `widget` of `group`, `group-multiselect`,
   `user` or `user-multiselect` exactly like the matching schema format (it sets
   `groupPicker` / `userPicker`). An override `x-default` becomes the field's
   `defaultToken`. A schema property with `widget: group` or `widget: user` counts too.
2. `resolveObjectOpType` takes `{ exactSchema: true }`; `CnFkResolveCell` uses it, so
   the slug a manifest names is used exactly as given.
3. The nested create from a picker uses the referenced schema's registered create
   dialog or create override when the app has one, and falls back to the generic form.
4. Text header filters stay on equals until OpenRegister ships a contains operator.

## Impact

- `src/utils/schema.js`, `src/utils/actionsDispatcher.js`,
  `src/components/CnFkResolveCell/CnFkResolveCell.vue`,
  `src/components/CnFormDialog/CnFormDialog.vue`
- Backwards compatible. `resolveObjectOpType` keeps kebab-casing `$ref` titles for
  every other caller.
