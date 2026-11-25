# Tasks: reference-label-from-the-store-cache

- [x] 1. `CnFormDialog.resolveReferenceLabel()` reads `store.getCachedObject(slug, uuid)` before `fetchObject`.
- [x] 2. `tests/components/CnFormDialogCachedReferenceLabel.spec.js`: a cached object gives the label without a read; without a cached copy the object is fetched.
