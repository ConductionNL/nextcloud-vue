---
kind: code
---

# Proposal: screens-settings-form-reference-free-value

## Summary

portaliq's logo used to be a free text field, so it could hold any URL. As a settings-form `reference` field it can
only pick an object (a URL already stored stays selectable, but a new one cannot be entered), so the move to the
reference field (portaliq #1536) would lose that capability. A `reference` field with `free: true` now also has a
typed input: the value the form holds when it is not one of the objects. Typing sets the value, picking an object
clears the typed input. `freePattern` / `freePatternMessage` check a typed value only.

## Scope

- `src/components/CnSettingsFormWidget/CnSettingsFormWidget.vue`: the typed input, `freeValue`, validation.
- Widget content (`free`, `freeLabel`, `freePlaceholder`, `freePattern`, `freePatternMessage`), no manifest schema change.
- Without `free` the field renders as before.
