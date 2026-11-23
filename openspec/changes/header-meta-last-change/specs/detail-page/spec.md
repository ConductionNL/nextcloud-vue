# detail-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [header-meta-last-change](../../)

## Purpose

A record page can say who changed the record last.

## ADDED Requirements

### Requirement: The header meta line can name who changed the record last

With `headerMetaLastChange` CnDetailPage SHALL read the newest create or update entry of the record's audit trail and
offer it to the `headerMeta` template as `_lastChange`. Without it the page SHALL not read the trail. A failed read SHALL
leave the `_lastChange` tokens empty.

#### Scenario: DqZaaktype

- **GIVEN** `headerMeta: "last changed {_lastChange.created|date} by {_lastChange.userName}"` and `headerMetaLastChange: true`
- **AND** the newest update entry is Lars de Koning's on 2 October
- **THEN** the meta line reads "laatst gewijzigd 2 okt door Lars de Koning"
