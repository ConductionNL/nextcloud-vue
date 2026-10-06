# Tasks: review-round-two

## 1. Picker widgets from field overrides (R1)
- [x] `fieldsFromSchema` sets `groupPicker` / `userPicker` for an override widget and reads an override `x-default`.
- [x] Tests: `tests/utils/schemaPickers.spec.js`, `tests/components/CnFormDialogPickers.spec.js` (7 fail on the old code).

## 2. Exact fkResolve slug (R2)
- [x] `resolveObjectOpType(store, source, { exactSchema: true })`; `CnFkResolveCell` passes it.
- [x] Test: `tests/components/CnFkResolveCell.spec.js` (fails on the old code with `pipelinq/product-category`).

## 3. App create dialog from a picker (R3)
- [x] Nested create looks up the manifest page whose `config.schema` (and `config.register`) matches. Its `createOverride` saves the generic nested form through the app's handler; without one, its `createModal` opens the app's dialog (`created` event with the object or its id). Neither: the generic form as before.
- [x] Tests: `tests/components/CnFormDialogPickers.spec.js` (override, override error, modal, modal closed, fallback; 4 fail on the old code).

## 4. Contains on text header filters (R4)
- [ ] Switch to the OpenRegister contains operator once it is merged there.
