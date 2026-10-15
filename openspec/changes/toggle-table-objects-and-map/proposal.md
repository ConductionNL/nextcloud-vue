---
kind: code
---

# Proposal: toggle-table-objects-and-map

## Summary

Shillinq's ShInstellingen board draws "Verplichte velden" as a card with one switch per required field. Each required field is a FieldRequirement object. The library's switch widgets (`switch-rows`, `toggle-table`) bind to fields of ONE current object, so a settings page with no current object, or a list of objects, had nothing to use.

`toggle-table` grows two `bind` modes:

- `each`: every row is an object read by `source` (its key the object id). The switch is that object's own boolean field, and a toggle PATCHes that object (`bind.register` / `bind.schema`, else the surface's). No current object is needed.
- `map`: a config map holds a boolean per row key, read from `bind.url` (at `bind.path`) and written through `save`, or held in one field of the current object and written by its dot-path.

`invert` works in both. A refused write draws the stored value again and shows the server's words, as before. `CnSettingsPage` resolves `toggle-table` as a built-in settings widget, so a manifest settings page can use it without registering a component.

## Scope

- `src/components/CnToggleTableWidget/CnToggleTableWidget.vue`: `each` and `map`.
- `src/components/CnSettingsPage/CnSettingsPage.vue`: `toggle-table` built-in.
- The widget's `flag` and `list` modes are unchanged. No schema change (widget `content` is not typed in the manifest schema).
- Not built: the board's "Opslaan" button under the card. A toggle saves at once, as every library switch widget does.
