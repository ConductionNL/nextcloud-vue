# dashboard-page Delta: endpoint-source-card-grid-record-list

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [endpoint-source-card-grid-record-list](../../)

## Purpose

A record list and a card grid can be fed from an app endpoint, as other widgets can.

## ADDED Requirements

### Requirement: A record list and a card grid can read an endpoint

A record list with `content.endpointSource` (with a `url`) SHALL read its rows from that endpoint through the shared
endpoint engine and SHALL NOT request OpenRegister. The rows SHALL be the payload at `responsePath`; a payload that is not
an array SHALL be an empty list; a failed read SHALL show the error text. The templates, pill, row route and header
count SHALL apply as for OpenRegister rows. A card grid with an `endpointSource` and no `objects` SHALL draw a card per
object in the payload at `responsePath`; given `objects` SHALL win and no request SHALL be made.

#### Scenario: Bank accounts with balances

- **GIVEN** a record list with `endpointSource` `{ "url": "/apps/shillinq/api/v1/cash-position", "responsePath": "accounts" }` and `title` `{name}`
- **WHEN** the endpoint returns two accounts
- **THEN** the list shows both accounts by name, and the header count reads 2

#### Scenario: A card grid fed by the endpoint

- **GIVEN** a card grid with the same `endpointSource` and no `objects`
- **WHEN** the endpoint returns two accounts
- **THEN** the grid draws two cards
