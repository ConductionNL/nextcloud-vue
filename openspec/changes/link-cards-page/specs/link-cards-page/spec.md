# link-cards-page Delta: link-cards-page

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [link-cards-page](../../)

## Purpose

One page that opens every page a short menu leaves out. Related: ADR-044
(cards collapse), ADR-112 (reports are one page), WCAG 2.2 AA.

## ADDED Requirements

### Requirement: A links page renders grouped link cards

`pages[].type: "links"` SHALL mount `CnLinkCardsPage`. `config.categories`
maps a group key to its caption and sets the group order. `config.cards` is
the list of cards; a card's `category` names its group. Cards without a known
category SHALL render first, under no caption. Title, description, captions,
labels and card descriptions SHALL go through the app's translate function.

#### Scenario: Cards sit under their caption

- **GIVEN** categories `sales` and `marketing` and cards in both
- **WHEN** the page renders
- **THEN** each caption SHALL be a heading followed by a list of its cards, in declaration order

#### Scenario: An empty group is not rendered

- **GIVEN** a category none of whose cards is visible
- **WHEN** the page renders
- **THEN** its caption SHALL NOT render

#### Scenario: Nothing to show

- **GIVEN** no visible card at all
- **WHEN** the page renders
- **THEN** an empty text SHALL render

### Requirement: A card is a real link

A card SHALL be an `<a>` with a real href. `route` is a route name, or a path
when it starts with `/`, resolved through the router so it works with and
without `/index.php`; `params` and `query` are passed along. A plain click
SHALL navigate through the router; a modified click is left to the browser.
`href` is an external URL and opens in a new tab. A card with neither, or
whose route does not resolve, SHALL NOT render.

#### Scenario: A route card navigates in the app

- **GIVEN** a card with `route: "Leads"`
- **WHEN** it is clicked
- **THEN** the router SHALL be pushed `{ name: "Leads" }`

### Requirement: Cards honour menu visibility conditions

A card's `visibleIf` SHALL be evaluated the way a menu entry's is:
`appInstalled`, then dot-path predicates against `manifest.runtime`. A card's
`permission` SHALL be checked against the provided permissions, with an empty
list meaning allow.

#### Scenario: A gated card is hidden

- **GIVEN** a card with `visibleIf: { "user.isAdmin": true }` and a non admin
- **WHEN** the page renders
- **THEN** the card SHALL NOT render

### Requirement: Every page component the renderer mounts is exported

Every component in `defaultPageTypes` SHALL be a named export of the library
entry.

#### Scenario: Reports page is importable

- **GIVEN** `import { CnReportsPage } from '@conduction/nextcloud-vue'`
- **WHEN** the import resolves
- **THEN** it SHALL be the component, not undefined

### Requirement: Menu entries that differ in query

`CnAppNav` SHALL mark a menu entry with a `query` active only when the route
matches and the address carries every key of that query. An entry without a
`query` SHALL NOT be active while a sibling on the same route has a matching
query.

#### Scenario: Two entries on one route

- **GIVEN** entries "My work" (`route: Cases`, `query: { assignee: "me" }`) and "All cases" (`route: Cases`)
- **WHEN** the address is the Cases route with `?assignee=me`
- **THEN** only "My work" SHALL be active

### Requirement: A filter operator is serialised in bracket form

`buildQueryString` SHALL serialise a plain object under a filter key as
`key[op]=value`, and an array operand as `key[op][]=value`. A key that starts
with `_` SHALL keep its JSON form. A key already in bracket form SHALL pass
through unchanged.

#### Scenario: A count source with a date operator

- **GIVEN** a `visibleWhen.source.filter` of `{ "slaDeadline": { "lt": "2026-10-06" } }`
- **WHEN** the count is requested
- **THEN** the URL SHALL carry `slaDeadline[lt]=2026-10-06` and no JSON

### Requirement: An attention card with a title keeps its cell

`CnDashboardPage` SHALL treat an attention banner's `title` as its text when
it declares no `text`, so the cell follows `visibleWhen` and nothing else. A
card whose `text` equals its `title` SHALL show the words once.

#### Scenario: Title and reason, no text

- **GIVEN** a banner with `layout: "attention"`, a `title`, a `reason` and a met `visibleWhen`
- **WHEN** the dashboard renders
- **THEN** the card SHALL render in its cell

### Requirement: A long detail title wraps before it truncates

The detail page title SHALL wrap to two lines and truncate after that. The
full title SHALL stay reachable through a `title` attribute.

#### Scenario: A long case title

- **GIVEN** a title longer than one line
- **WHEN** the header renders
- **THEN** the title SHALL show up to two lines and carry the full text as its `title`
