---
kind: code
---

# Proposal: dynamic-question-hide-on-create

## Summary

`x-openregister-extends-form` shows every question of the chosen case type on
the create form, with no way to keep one off. dossiq now fills the Woo
"Ontvangen op" (receiptDate) answer itself when a case is created, so asking
for it on the create form asks for a value the app overwrites, and a required
one blocks Create.

## What changes

A definition record may carry `hideOnCreate: true` (or the field
`config.map.hideOnCreate` names). `CnFormDialog` gives such a question no field
while it creates an object, required or not, and shows it as usual on the edit
form. `propertiesFromDefinitions` takes `{ create: true }` to apply it.
Additive and opt-in: records without the flag render as before.
