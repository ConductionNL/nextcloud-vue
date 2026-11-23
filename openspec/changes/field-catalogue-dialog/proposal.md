---
kind: code
---

# Proposal: field-catalogue-dialog

## Summary

Board DqZaaktypeVelden draws "Attribuut kiezen uit de catalogus": the catalogue's folders on the left with a count each ("Alle attributen 24", "Adres 6", "Financiën 5", "Ongecategoriseerd 9", "Gedeelde attributen 4"), the attributes on the right under their folder with their type ("getal, euro") and, for a shared one, how many case types use it ("in 3 zaaktypen"), a checkbox each. CnFieldPicker is a single select and CnFolderTree only the tree; nothing puts them together. CnFieldCatalogueDialog does, generic over any catalogue of fields in folders.

## Scope

- New `src/components/CnFieldCatalogueDialog/` (exported) over CnDialog (width `wizard`) and CnFolderTree.
- A read refusal is the dialog's alert notice (card-state-notices).
- Library strings (en + nl), docs page.

## Out of scope

- Reading the catalogue and adding the chosen attributes to the case type (dossiq: the app opens the dialog with the fields and folders it read, and saves on `select`).
