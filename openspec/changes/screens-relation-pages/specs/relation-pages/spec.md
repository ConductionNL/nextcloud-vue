# relation-pages Delta: screens-relation-pages

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-relation-pages](../../)

## Purpose

A person page and an organisation page are manifest configuration over generic
widgets, and look like the boards PqKlant, DqContact, PqOrganisatie,
DqOrganisatie and ShKlant. See design.md for the canonical shape and the
example manifests.

## ADDED Requirements

### Requirement: A tab can hold a stack of widgets

A `content.tabs[]` entry of a `tabs` widget SHALL accept `widgetIds`, an array
of widget ids, instead of `widgetId`. The panel SHALL render every widget that
resolves, in the order given; an id that resolves to nothing SHALL be skipped.
Every widget SHALL render as a card with its own title. In the board look the
panel SHALL draw no frame or padding of its own, the first card SHALL join the
open tab, and every following card SHALL stand 20px below the one before. The tab label SHALL default to the first widget's title.
`countFrom: "widget"` SHALL count the first widget that has a list. A tab with
`widgetId` SHALL render exactly as before.

#### Scenario: The overview of a person

- **GIVEN** a tab `{ "widgetIds": ["person-card", "person-cases", "person-moments"], "label": "Overview" }`
- **WHEN** the Overview tab is open
- **THEN** the panel shows the person card, then a card titled "Cases", then a card titled "Latest contact moments"
- **AND** in the board look the first sits in the panel joined to the open tab and the next two are separate cards 20px apart

@e2e include e2e/screens-relation-pages.e2e.js

#### Scenario: An id that does not resolve

- **GIVEN** a stack `["person-card", "missing"]`
- **WHEN** the tab is open
- **THEN** only the person card renders, without an error

### Requirement: A record list shows the objects that point at this record

The library SHALL register a `record-list` widget type. Its content SHALL take
the source keys of `object-list`: `register`, `schema`, `filter` (with the
`@objectId`, `@object.<field>` and `@workspace.<key>` tokens), `sort`
(`{ field, dir }`), `limit` (default 5), `extend` and `rowRoute`, plus
`rowIdField` (the dot path of the id the route receives, default the row's
id). It SHALL fetch the list from the objects endpoint and SHALL NOT fetch while
a required token is unresolved. It SHALL draw its own card through
CnWidgetWrapper with the widget title.

Templates SHALL use `{path}` tokens read from the row (dot paths, extended
references included) with an optional format after a bar: `date` (the board's
short date, "1 nov", "18 nov 2025"), `datetime` ("4 okt, 10:52"). A template
whose token is empty SHALL render nothing. Template text SHALL pass through the
host's translate function before the tokens are filled.

`presentation` SHALL be one of:

- `rows` (default): per row a `title` template in bold, a `meta` template line
  under it, a `pill` (`{ field, colorMap?, labels?, variant? }`, through
  CnStatusBadge), a `trailing` text (a template, or an array of templates of
  which the first that fills is shown) and a chevron. With a `rowRoute` the row
  is a link.
- `feed`: per row a round icon (`icon: { field, map, default }` or an icon
  name), a `meta` template line and a `text` template line.
- `inline`: per row a `label` template followed by the `title` template, which
  is a link when a `rowRoute` is set.

`headerLink` (`{ label, route, params?, query? }` or `{ label, href }`) SHALL
draw a link in the card header; `{total}` in its label SHALL be the list's
total and `query` values SHALL resolve tokens. `headerNote` SHALL draw a muted
text in the same place, with `{total}`. An empty list SHALL show `emptyText`
on one line, and a failed fetch one quiet error line.

#### Scenario: Open cases as rows

- **GIVEN** a `record-list` with `presentation: "rows"`, `title: "{title}"`, `meta: "{identifier} · {caseTypeName}"`, `pill: { field: "status" }`, `trailing: ["Klaar {closedAt|date}", "Termijn {deadline|date}"]`, and two cases, one open with deadline 1 November and one closed on 18 November 2025
- **WHEN** the widget renders in October 2026
- **THEN** the first row reads its title, "2026-0082 · Woo-verzoek", its status pill and "Termijn 1 nov"
- **AND** the second row reads "Klaar 18 nov 2025"

@e2e include e2e/screens-relation-pages.e2e.js

#### Scenario: The total in the header

- **GIVEN** `headerLink: { label: "Alle {total} zaken bekijken", route: "Cases" }` and a list total of 2
- **WHEN** the widget has loaded
- **THEN** the header shows the link "Alle 2 zaken bekijken"

#### Scenario: A feed of contact moments

- **GIVEN** `presentation: "feed"`, `icon: { field: "channel", map: { "phone": "Phone" }, default: "EmailOutline" }`, `meta: "{startTime|datetime} · {channel}"`, `text: "{summary}"`
- **WHEN** a row has channel `phone`
- **THEN** that row shows the phone icon, the meta line and the summary

#### Scenario: Waiting for the record

- **GIVEN** a filter `{ "requester": "@objectId" }` and no record yet
- **WHEN** the widget mounts
- **THEN** no request is sent

### Requirement: A facts card shows configured fields of the record

The library SHALL register a `facts` widget type that reads the page's record
(`objectData`) and draws a card through CnWidgetWrapper with the widget title.
Its content SHALL take, all optional and drawn in this order:

- `lead`: `{ icon?, initialsFrom?, title, subtitle? }`: an icon in a tinted
  square, or the initials of the value at `initialsFrom`, beside a bold title
  and a muted subtitle (templates). The lead SHALL not render when its title is
  empty.
- `lines`: an array of templates, one line each; empty lines are dropped.
- `rows`: `[{ label?, icon?, field, format?, copy?, reveal? }]`, a label or icon
  beside the value of `field`. `format` is `text` (default), `email` (a mailto
  link), `phone` (a tel link), `url` (a link), `date`, `boolean` (Ja/Nee
  through translate) or `masked` (all but the last four characters as `*`).
  `copy: true` adds a copy button that writes the raw value to the clipboard.
  `reveal: true` on a masked row adds a Show button that shows the value and
  emits `reveal` with `{ field }`. A row with an empty value SHALL be dropped
  unless `hideEmpty` is `false`.
- `note`: a muted template line.
- `link`: `{ label, icon?, route?, params?, query?, href? }`, a link with
  token-resolved `query`.
- `action`: an action object, dispatched through the page's action dispatcher,
  drawn as a tinted button.
- `headerAction`: the same, drawn as a small "add" button in the card header.

When the lead, lines and rows are all empty the card SHALL show `emptyText`
(default "Nothing on file").

#### Scenario: An address card

- **GIVEN** `lines: ["{address.street} {address.number}", "{address.postcode} {address.city}"]` and a record at Parkstraat 24, 3311 AB Zuiddrecht
- **WHEN** the card renders
- **THEN** it shows "Parkstraat 24" and "3311 AB Zuiddrecht" on two lines

@e2e include e2e/screens-relation-pages.e2e.js

#### Scenario: A masked number with reveal

- **GIVEN** a row `{ label: "BSN", field: "bsn", format: "masked", reveal: true }` and BSN 123457609
- **WHEN** the card renders
- **THEN** the row shows "*****7609" and a Show button
- **AND** after Show it shows "123457609" and the widget has emitted `reveal` with `{ field: "bsn" }`

#### Scenario: Contact channels as links

- **GIVEN** rows for email and phone with `format: "email"` and `format: "phone"`, and a record with an email and no phone
- **WHEN** the card renders
- **THEN** the email row is a mailto link and there is no phone row

### Requirement: A header pill can be a constant or a count

A `headerPill` (`typePill`, `statusPill`) SHALL accept `text` (a constant
label, through translate) instead of `field`, and `countFrom`
(`{ register, schema, filter? }`, filter tokens resolved) with `countLabel`
(`{ one, other }`, `{count}` replaced) instead of `field`. A count pill SHALL
count with one list request (`_limit=1`, the response's `total`) and SHALL not
render while the count is 0, unknown or failed. A pill with `field` SHALL
render as before. The manifest schema SHALL move to version 2.85.0.

#### Scenario: A resident with one open case

- **GIVEN** `typePill: { text: "Inwoner", variant: "info" }` and `statusPill: { countFrom: { register: "r", schema: "case", filter: { requester: "@objectId" } }, countLabel: { one: "{count} lopende zaak", other: "{count} lopende zaken" } }` and one case for this record
- **WHEN** the page renders in the board look
- **THEN** row 2 of the header starts with the pills "Inwoner" and "1 lopende zaak"

### Requirement: A list column can count related objects per row

A column of an index page SHALL accept `countFrom` (`{ register, schema,
filter }` with `@row.<field>` tokens) and render the count of that list for
each visible row as a count pill, "Geen" (through translate) for 0. Counts
SHALL be fetched for the visible page only.

#### Scenario: Open cases per organisation

- **GIVEN** a column `{ key: "openCases", label: "Lopende zaken", countFrom: { register: "r", schema: "case", filter: { requester: "@row.id", "status[ne]": "closed" } } }`
- **WHEN** the list shows eight organisations
- **THEN** each row shows its own count, and a row with none shows "Geen"
