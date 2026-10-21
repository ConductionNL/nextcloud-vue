# detail-page Delta: detail-endpoint-source

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A detail page can read its record from an app endpoint

A detail page with `entitySource: "endpoint"` SHALL read its record with a GET of `sourceConfig.url`, the record id
filled in for `{id}`, and SHALL read it at `sourceConfig.recordPath` when set. A refused (403) or missing (404) record,
or an answer that holds no record, SHALL show the not-found state. Without a url naming `{id}` nothing SHALL be requested.

#### Scenario: A cash register audit entry

- **GIVEN** a detail page with `entitySource: "endpoint"` and `sourceConfig.url` `/apps/pipelinq/api/kassakoppeling/audit/{id}`
- **WHEN** the auditor opens entry a1
- **THEN** the page shows the entry the endpoint answers for a1

### Requirement: A facts amount can be stored in cents

A facts entry with `format: "currency"` and `minorUnits: true` SHALL read its value as cents.

#### Scenario: An audit amount

- **GIVEN** an audit entry whose `amount` is 1250
- **THEN** the entry reads "€ 12,50"
