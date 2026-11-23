# action-dialog-search-field Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [action-dialog-search-field](../../)

## Purpose

An action dialog can ask for another record, and speaks about the record in hand.

## ADDED Requirements

### Requirement: An action dialog field can search records

A CnActionDialog `fields[]` entry with `type: "search"` SHALL render a search select. When the reader types and the
typing rests, it SHALL read `/apps/openregister/api/objects/<register>/<schema>` with `_search` and `_limit: 10` and
offer each found record as `optionLabel` (default `{title}`) with `optionSecondary` under it, both filled from that
record. With `excludeSelf` the record in hand SHALL NOT be offered. The chosen record's id SHALL be sent under `field`.

#### Scenario: Zaak koppelen

- **GIVEN** a dialog on case 2026-0082 with a search field over the case schema, `excludeSelf: true`
- **WHEN** the reader types "fiets"
- **THEN** the cases found are offered as "2026-0090 · Fietspad" with their case type under them, 2026-0082 is not
  among them, and the chosen case's id is sent

### Requirement: Every action dialog field is labelled from the record

Every field's `label`, `hint` and `placeholder` SHALL be translated and then filled from the record, whatever its type,
and a `hint` SHALL show under the field.

#### Scenario: A message to the applicant

- **GIVEN** a text field labelled "Message to {initiatorDisplayName}" on Sanne de Vries's case
- **THEN** its label reads "Message to Sanne de Vries"
