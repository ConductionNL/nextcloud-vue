# Proposal: settings-fields-inline-save-and-advanced

## Why

DqBeheerinstellingen draws two settings cards the field section cannot draw:

- Serviceaccount voor achtergrondtaken is one field with "Dit account gebruiken" right beside it. The section put the
  button at the end of the card, under the field.
- Zaak-e-mail draws six fields: account, folder, interval, batch size, the case type for unclaimed mail and the
  case-number switch. dossiq has eight more (transport account, pattern, sender address and name, allowed recipients,
  intake group, blocked senders, junk rules) that users keep. The section could only show all fourteen.

## What changes

- `saveInline` draws the Save button beside the form, lined up with the control (in the board look under its label).
- A field with `advanced: true` is drawn behind one disclosure after the other fields (`advancedLabel`, default
  "Advanced"), closed at first, opened when one of its fields is refused, and saved with the rest.

Without either, nothing changes.

## Scope

nextcloud-vue CnSettingsFieldsSection and the board look CSS; dossiq's admin settings use both (R22-DASH). Component props
and field keys, no manifest schema change.
