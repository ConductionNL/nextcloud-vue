---
kind: code
---

# Proposal: screens-switch-value-map

## Summary

The `switch-rows` widget and a `settings-form` switch read only `=== true` and write a boolean. App config flags are
often stored as the strings `"1"`/`"0"` or `"true"`/`"false"` (decidiq admin), so such a flag showed off and a toggle
wrote a boolean the app does not read. A switch now takes a value map, `values: { on, off }`: it reads the `on` value
(compared as text, so `1` and `"1"` are the same) as on and writes `on` / `off`.

## Scope

- `src/utils/switchValues.js`: `switchValueMap`, `switchIsOn`, `switchStoredValue`.
- `src/components/CnSwitchRowsWidget/CnSwitchRowsWidget.vue`: `rows[].values`, and `values` on the widget for every row
  that declares none; `invert` still applies on top.
- `src/components/CnSettingsFormWidget/CnSettingsFormWidget.vue`: `fields[].values` on a `switch` field.
- Widget content, no manifest schema change. Without `values` a switch is a boolean, as before.
