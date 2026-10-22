# board-list-row-titles Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-list-row-titles](../../)

## Purpose

A list row in a card reads as the boards draw it.

## ADDED Requirements

### Requirement: A board list row is titled at 500 over a 13px line

In the board look a CnRecordListWidget row outside a dashboard SHALL be padded 10px above and below, its title SHALL
be weight 500 in the main text colour at the normal line height, and the line under it SHALL be 13px at the normal line
height, so a two-line row is 56px. A CnAuditTrailCard row's action SHALL be weight 500, and its time and actor 13px.
The Nextcloud look and the dashboard's record list SHALL keep their own rows.

#### Scenario: DqZaaktype "Versies"

- **GIVEN** a case type's versions listed by a record list widget in the board look
- **THEN** "Versie 4" reads at weight 500 with "2 okt 2026 · 31 lopende zaken" at 13px under it, and the row is 56px high
