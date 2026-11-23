---
kind: code
---

# Proposal: screens-settings-form-reference-object-filter

## Summary

A settings-form `reference` field reads the objects to choose from with a fixed `filter`. portaliq's logo field must
list the logos of the portal being edited, so the filter has to name that record. `filter` values may now be
`@objectId` and `@object.<field>`, resolved against the record the form edits (the same tokens and resolver the other
widgets use, `resolveFilterTokens`).

## Scope

- `src/components/CnSettingsFormWidget/CnSettingsFormWidget.vue`: `loadReferences` resolves the tokens, waits while the
  record has no value for one, and reads again when the record changes the resolved query.
- Widget content, no manifest schema change. A filter without tokens is read once, as before.
