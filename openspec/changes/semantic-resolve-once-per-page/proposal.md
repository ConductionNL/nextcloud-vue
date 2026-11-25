## Why

Every CnFormDialog that names a semantic reference (ADR-048) asks OpenRegister's
`resolve-by-implements` again on open (0.6 s measured on dossiq's New case from
a mail, PERF-HANDOFF), although which app implements a URI only changes when an
app is installed or removed, and that reloads the page.

## What Changes

- `src/utils/semanticResolve.js`: `resolveSemanticType(uri)` keeps the answer
  per URI for the page and shares an in-flight request; a failed request is not
  kept. `clearSemanticResolutions()` forgets them.
- `CnFormDialog.resolveSemanticReference()` goes through it.

## Impact

- The second and later forms on a page open their semantic pickers without a
  request. The first open is unchanged.
