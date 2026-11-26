## Why

dossiq's New case dialog opened from a mail shows the chosen case type by its
name. `CnFormDialog.resolveReferenceLabel()` reads that case type by id after
the dialog mounts (0.6 s measured, PERF-HANDOFF), even when the caller already
read the same object into the shared object store before opening the dialog.
The store keeps every object it fetched in `objects[type][id]`, but the label
lookup never looks there.

## What Changes

- `CnFormDialog.resolveReferenceLabel()` takes the label from the object store's
  cached object (`getCachedObject(type, id)`) when it holds one, and fetches only
  when it does not.

## Impact

- `src/components/CnFormDialog/CnFormDialog.vue`.
- Nothing changes when the store holds no copy: the object is fetched as before.
