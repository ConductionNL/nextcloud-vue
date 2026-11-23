---
kind: code
---

# Proposal: screens-settings-nested-paths

## Summary

The settings widgets (`settings-form`, `radio-cards`, `chips-field`, `switch-rows`, `toggle-table`) read a field by
dot-path but wrote only a top-level field. Portaliq keeps a portal's sign-up policy and allowed domains under
`authentication.registration`, so the board's "Aanmelden" and "Zonder goedkeuring" could not be configured. This change
lets every one of these widgets name a nested field, and lets a widget write through an app endpoint when the setting
does not live on the object (portaliq's sign-in methods go through `/api/portals/{slug}/signin`).

## Scope

- `src/utils/objectWrite.js`: `writeFields` (nested paths, one PATCH, re-read of the enclosing top-level object) and
  `fillSaveTemplate` (the `save` url, method and payload templates).
- The five widgets call `writeFields` and read the server's answer by path.
- No manifest schema change: widget `content` is free-form, so no schema version is taken.
