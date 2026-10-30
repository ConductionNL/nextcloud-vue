# record-list Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-footnote-own-source](../../)

## Purpose

A list can end with one fact about its record that lives somewhere else than its rows.

## ADDED Requirements

### Requirement: A record-list footnote can read its own source

A CnRecordListWidget `footnote` given as `{ text, source }`, with `source` an endpoint source (`{ url, params?,
responsePath? }`, page tokens such as `@objectId` filled in), SHALL read its value from that request and SHALL show
`text` with `{value}` replaced by it. It SHALL show when the list has no rows, and SHALL NOT show when the value is
empty, zero or missing. A footnote `{ path, text }` SHALL keep reading the list's own answer.

#### Scenario: DqTenant "Historie"

- **GIVEN** the organisation's history card with `footnote: { text: "Reference {value}", source: { url: ".../tenantSubscription?tenantRef=@objectId", responsePath: "results.0.reference" } }`
- **THEN** the card ends with "Reference TEN-0014" under its events

#### Scenario: No subscription

- **GIVEN** the same card for an organisation without a subscription
- **THEN** the card shows no footnote
