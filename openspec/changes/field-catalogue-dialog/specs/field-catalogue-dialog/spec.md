# field-catalogue-dialog Delta: field-catalogue-dialog

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [field-catalogue-dialog](../../)

## Purpose

A person picks fields from a shared catalogue kept in folders, seeing what each is and how widely it is used.

## ADDED Requirements

### Requirement: A dialog picks attributes from a catalogue in folders

CnFieldCatalogueDialog SHALL list "All attributes" first with the count of every pickable field, then each folder of `folders` with its count, then "Uncategorised" for fields in no known folder when there are any. Fields in `excludeIds` SHALL be left out. With All chosen the fields SHALL show under their folder's name; with a folder chosen only that folder's. Each field SHALL show its label and a meta line of its type and, for a `usageCount` above one, `usageLabel` with `{count}` filled (default "in {count} places"). Add SHALL be disabled until a field is chosen and SHALL emit `select` with the chosen fields; Cancel SHALL emit `closing`. An `error` SHALL be the dialog's alert notice.

#### Scenario: The board's catalogue

- **GIVEN** the folders Adres, Financiën and Gedeelde attributen and the field Kenteken (tekst) used by 3 case types in Gedeelde attributen
- **THEN** Kenteken reads "tekst · in 3 zaaktypen" under the heading Gedeelde attributen
