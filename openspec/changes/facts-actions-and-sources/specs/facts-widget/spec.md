# facts-widget Delta: facts-actions-and-sources

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [facts-actions-and-sources](../../)

## Purpose

A facts card can carry the actions of the record it shows, and can read that record from a query, an app endpoint or
rows the server answers.

## ADDED Requirements

### Requirement: Facts can carry declared actions

A facts widget's `actions[]` SHALL take the entries a detail page's `headerActions` takes and draw them as buttons under
the facts. `@source.<field>` in an action SHALL name a field of the record the facts show, and an action whose token
names an empty field SHALL NOT be drawn. An action's `visibleWhen` SHALL be judged against the record the facts show.
An action with `adminOnly: true` SHALL be drawn for an instance admin only. A page refresh SHALL make the facts read their
source again.

#### Scenario: A failed payment can be tried again

- **GIVEN** facts over a payment whose `status` is `failed`, with a Try again api-call visible while the status is `failed`
- **WHEN** the cashier presses Try again and the payment is now `paid`
- **THEN** the call posts to the payment's own retry url, the card reads the payment again, shows Paid and no Try again

#### Scenario: A reversal is for admins

- **GIVEN** an action with `adminOnly: true`
- **WHEN** a cashier who is not an admin opens the card
- **THEN** the action is not drawn

### Requirement: Facts can show the first match of a query

A `source` with `register`, `schema` and `filter` but no `id` SHALL read the first object that matches the filter in
`sort` order, and SHALL show the empty text when nothing matches. While a filter token is unresolved no request SHALL be
sent.

#### Scenario: The latest count of a shift

- **GIVEN** a shift page and facts with `source { schema: cashDiff, filter: { shift: "@objectId" }, sort: { field: createdAt, dir: desc } }`
- **WHEN** the page opens
- **THEN** the card shows the latest count of that shift

### Requirement: Facts can read an app endpoint

`endpointSource` SHALL take the block a stat or chart tile takes and read the record at its `responsePath`. When
`emptyWhen` names a path whose value is truthy, the card SHALL show its empty text.

#### Scenario: A client's satisfaction

- **GIVEN** facts with `endpointSource { url: "/apps/pipelinq/api/clients/@objectId/satisfaction" }`
- **WHEN** the endpoint answers `{ "empty": true }` and `emptyWhen` is `empty`
- **THEN** the card shows its empty text

### Requirement: Facts can draw the rows the source answers

`rowsPath` SHALL name a list of `{ label, value }` in the record, drawn as rows after the declared fields, an empty value
dropped like any other row.

#### Scenario: What the resident sees

- **GIVEN** a ticket preview whose `bespoke.rows` lists Status and Received
- **WHEN** facts with `rowsPath: "bespoke.rows"` render it
- **THEN** both rows show with the labels the server chose

### Requirement: A facts entry can fill a template

An entry's `template` SHALL fill its `{path}` placeholders from the record and SHALL be empty when every placeholder is
empty. `suffix` SHALL be added to a value that is not empty. `format: "number"` SHALL show a number in the reader's
language with `decimals` fraction digits when set. A pill over a boolean SHALL look its tone up in `variantMap` as
`"true"` or `"false"`, as `map` reads it.

#### Scenario: Stock with its unit

- **GIVEN** a product with `available` 12 and `unit` "pcs", and an entry `{ "label": "Stock", "template": "{available} {unit}" }`
- **WHEN** the facts render
- **THEN** the entry reads "12 pcs"
