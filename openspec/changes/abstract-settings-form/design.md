# Design: abstract-settings-form

- Read: `objectData[field.key]` for each configured field (top-level keys, because the PATCH is per top-level field).
- Baseline: the widget keeps the last saved values. A save moves it forward (with what the server answered). A field
  the person has not touched follows a new `objectData`; a touched field keeps the typed value. Comparing with the
  loaded object instead skipped the PATCH when a field was edited back to the loaded value after a save (portaliq
  PortalDetailsForm had exactly that bug).
- Write: PATCH `{ changedKey: value }` only. Nothing changed: no request, the saved note shows. Numbers go out as
  numbers, an emptied value as null. The server's refusal is shown in its own words and the typed values stay.
- Validation before any write: `required`, number `min`/`max`, text `pattern` (+ `patternMessage`).
- Look: native controls framed with a 1px `--color-border-maxcontrast` border, `--cn-board-control-height` (40px) and
  `--cn-board-control-radius` (8px); 13px 600 labels; 12px hints in `--color-text-maxcontrast`. Two columns by
  default, one under 640px; `wide` (textarea by default) spans the row. Switches use NcCheckboxRadioSwitch.
- Security: only configured fields are sent; OpenRegister authorises the PATCH. No `_rbac` override.
