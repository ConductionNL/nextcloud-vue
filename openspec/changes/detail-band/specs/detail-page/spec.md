# detail-page Delta: detail-band

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-band](../../)

## ADDED Requirements

### Requirement: A detail page can draw a band across the page above the body and the side column

CnDetailPage SHALL take a `band` prop (manifest `config.band`), a list whose entries are a widget id declared in
`widgets`, a widget definition, or `{ widgetId, span, chrome }`. When the list resolves to at least one visible widget the page
SHALL draw the band between the header and the body, across the page's full width, so the body and the side column both
start under it. An entry SHALL take `span` twelfths of the row (default 12) and the entries SHALL wrap when the row is
full or too narrow. An entry whose `visibleWhen` does not hold SHALL take no room. An entry's `chrome` (`card` or `bare`) SHALL
choose its frame; without it a `banner` widget SHALL draw bare and any other widget as a card. Without `band` the page SHALL render as before.

#### Scenario: PtPortal

- **GIVEN** a portal's detail page whose `config.band` lists the four traffic KPIs at span 3 and the start-page notice
- **AND** a side column
- **THEN** the four KPIs stand in one row across the page and the notice under them, full width
- **AND** the tabs and the side column both start under the band

#### Scenario: no band

- **GIVEN** a detail page without `config.band`
- **THEN** no band element is rendered and the layout is unchanged

### Requirement: A detail header link builds its URL from the record

A detail page header action with `href` SHALL resolve the `@object.<field>`, `@objectId`, `@page.<key>` and `@config.<key>`
tokens in that `href` against the shown record before it resolves the URL, so a link can point at a URL built from the
record. An `href` without tokens SHALL resolve as before.

#### Scenario: PtPortal "Website bekijken"

- **GIVEN** a portal with slug `zuiddrecht` and a header action `{ href: "/apps/portaliq/site?route=%2F&portal=@object.slug", target: "_blank" }`
- **THEN** the button links to the instance URL of `/apps/portaliq/site?route=%2F&portal=zuiddrecht` in a new tab

### Requirement: A detail page's own primary action is a link

When no stage action stands in for it, a detail page's `primaryAction` with `route` (and an optional `query`) SHALL render
as an in-app link a plain click routes to; with `href` (its record tokens resolved) it SHALL link there in a new tab.
The `primary-action` event SHALL still be emitted.

#### Scenario: PtPortal "Nieuwe pagina"

- **GIVEN** a portal page whose `primaryAction` is `{ label: "New page", route: "Pages", query: { action: "create" } }`
- **THEN** the primary button links to the Pages route with `?action=create`, and a plain click routes there in the app
