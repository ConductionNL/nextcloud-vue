# Proposal: action-dialog-search-field

## Why

DQ-DIALOGS builds "Zaak koppelen" on CnActionDialog: the reader looks up another case and links it. The dialog's
fields offered text, date, datetime, select and checkbox, with no way to find a record. Its text and select labels were
also fixed text, so a label could not name the applicant ("Bericht aan {initiatorDisplayName}") as the checkbox can.

## What changes

- A `fields[]` entry takes `type: "search"`, built on CnSearchSelect. It finds records of `source: { register, schema }`
  in OpenRegister as the reader types, shows each as `optionLabel` with `optionSecondary` under it, leaves the record
  in hand out with `excludeSelf`, and sends the chosen record's id.
- Every field's `label`, `hint` and `placeholder` are filled from the record. A `hint` now shows under any field.
