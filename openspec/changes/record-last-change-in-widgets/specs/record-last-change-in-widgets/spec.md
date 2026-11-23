# record-last-change-in-widgets Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-last-change-in-widgets](../../)

## Purpose

A widget on a detail page can name who changed the record last.

## ADDED Requirements

### Requirement: A widget can read who changed the record last

- CnDetailPage SHALL take `recordLastChange`; with it or with `headerMetaLastChange` it SHALL read the record's newest
  create or update audit entry and provide it as `cnRecordLastChange` (null until read, or when it cannot be read).
- CnFactsWidget SHALL read that entry as `_lastChange.*` on the record it shows; a labelled part whose value is empty
  SHALL be left out.

#### Scenario: DqContact "Historie"

- **GIVEN** a contact page with `recordLastChange` and a side facts card with the parts "Last changed on", the update
  date and `{ path: "_lastChange.userName", label: "by" }`
- **WHEN** Pieter Jansen changed the contact last
- **THEN** the card reads "Laatst gewijzigd op 3 oktober door Pieter Jansen"
