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
