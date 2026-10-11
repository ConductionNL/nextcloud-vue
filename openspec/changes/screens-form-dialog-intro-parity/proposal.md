---
kind: code
---

# Proposal: screens-form-dialog-intro-parity

## Summary

dossiq DqNieuweZaak (round6/dossiq/library-gaps.md 18): the board's create
dialog has an eyebrow above the title ("Alle zaken") and an intro sentence
under it ("Velden met * zijn verplicht. De zaak start in de eerste status van
het zaaktype."). CnFormDialog draws both under the board look (`eyebrow`,
`subtitle`, from the dialog board mixin), but an `open-form` action can only
set the title (`formTitle`), so a manifest cannot ask for them.

## What changes

1. Two optional `$defs/action` keys, `formEyebrow` and `formSubtitle`
   (manifest schema 2.84.0).
2. CnActionButtons hands them, through the host translate, to the create
   dialog as `eyebrow` and `subtitle`.

Without the keys the dialog renders as today; outside the board look CnDialog
does not draw them.
