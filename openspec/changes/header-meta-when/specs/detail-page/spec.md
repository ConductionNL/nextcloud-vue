# detail-page Delta: header-meta-when

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [header-meta-when](../../)

## Purpose

A record page's header line can say different things in different states.

## ADDED Requirements

### Requirement: A header line can depend on the record

The detail page SHALL read `headerMetaWhen` as a list of `{ when, text }`, `when` a local `visibleWhen` condition on
the record. The first entry whose condition holds SHALL give the header line, filled from the record like
`headerMeta`. When no entry holds, or without the list, the line SHALL be `headerMeta`.

#### Scenario: Board PqOfferte

- **GIVEN** `headerMeta` "prices excl. VAT" and an entry for `status` draft reading "not sent yet · prices excl. VAT"
- **WHEN** a draft quote is shown
- **THEN** its header line reads "not sent yet · prices excl. VAT"
- **AND** an accepted quote's line reads "prices excl. VAT"
