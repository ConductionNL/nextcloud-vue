# Proposal: action-dialog-checkbox-field

## Why

The DqArchiveren board ends the archive dialog with a ticked box, "Sanne de Vries laten weten dat de zaak is
afgehandeld", with a hint under it. CnActionDialog's `fields` offered text, date, datetime and select only.

## What changes

A `fields[]` entry takes `type: "checkbox"`: a tinted box whose label and hint are filled from the record, starting at
`default`, sent as a boolean, optional unless `required: true`.
