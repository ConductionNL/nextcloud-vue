---
kind: code
---

# Proposal: manifest-validator-self-contained

## Summary

On the review instance of 10 October 2026, dossiq's "My case types" caption
showed without its pencil link and without the case types the user chose,
although `/api/manifest` answered 200 with both (finding N3).

The cause is in the library. The compiled manifest validator called two Ajv
runtime helpers through `require("ajv/dist/runtime/ucs2length").default` and
`require("ajv/dist/runtime/equal").default`. Rollup turns each into a bare
side-effect import that fills an `__exports` object. A consumer's webpack
drops that import, because the package `sideEffects` allowlist does not name
it, so `.default` is undefined and the validator throws `f is not a function`
on the first string it length-checks. `useAppManifest` caught the throw in a
silent catch-all and kept the bundled manifest, so no backend delta ever
reached the navigation, in any app that uses one.

## What changes

1. `scripts/build-validators.js` inlines every Ajv runtime helper the
   standalone validator uses (as it already did for ajv-formats), and the
   build fails when any `require(` survives in the output.
2. `useAppManifest` warns when resolving the manifest throws, instead of
   swallowing the error.
3. The jest global setup rebuilds the validator when the builder changed, not
   only when the schema did.

No API changes. No manifest changes.
