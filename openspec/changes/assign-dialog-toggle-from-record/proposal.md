# Proposal: assign-dialog-toggle-from-record

## Why

The DqOverdragen board names the applicant in the doorzending switch's note: "Sanne de Vries krijgt dan een bericht dat
de zaak naar een ander team gaat". CnAssignDialog printed a toggle's label and note as fixed text, so the manifest could
not name the applicant.

## What changes

A toggle's `label` and `note` are templates filled from the record, as the dialog's eyebrow already is. Text without
placeholders reads as before.
