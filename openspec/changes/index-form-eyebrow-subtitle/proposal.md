---
kind: code
---

# Proposal: index-form-eyebrow-subtitle

## Summary

Eight learniq boards draw the create dialog of an index page with an eyebrow over the title and a muted subtitle under it. CnFormDialog and CnAdvancedFormDialog already take `eyebrow` and `subtitle`; CnIndexPage gave its built-in form neither.

## Scope

- `src/components/CnIndexPage/CnIndexPage.vue` (props `formEyebrow`, `formSubtitle`), docs, `tests/components/CnIndexPageFormEyebrow.spec.js`.

## Out of scope

- The app manifests that configure it; this is the library half.
