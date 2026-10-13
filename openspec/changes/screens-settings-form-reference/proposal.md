---
kind: code
---

# Proposal: screens-settings-form-reference

## Summary

Portaliq stores a portal's logo as a free string that holds a URL or an object reference. The settings form could
only take that as typed text or as a file from Files. A field of type `reference` lets the person pick an object of a
configured register and schema, and stores its reference in a configured format.

## Scope

- `src/components/CnSettingsFormWidget/CnSettingsFormWidget.vue`: field type `reference`.
- No manifest schema change: widget `content` is free-form. Forms without such a field make no extra request.
