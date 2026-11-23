# tabs-widget-header-link Delta: tabs-widget-header-link

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [tabs-widget-header-link](../../)

## Purpose

A widget in a tab panel keeps the header link its manifest gives it.

## ADDED Requirements

### Requirement: The tab strip draws the open panel's header link

When the open tab's widget declares a header link (`headerLink` on the widget definition, or `content.headerLink`),
CnTabsWidget SHALL draw it as a text link beside the strip, outside the tablist and before the Actions menu. A
`route` SHALL be a router link to that named route with its `params` and `query`, an `href` a plain anchor. The label
SHALL go through the host translate. When another tab opens, the strip SHALL show that tab's link, or none.

#### Scenario: Open balance links to all sales invoices

- **GIVEN** a tabs widget whose first tab holds `open-invoices`, declaring `headerLink` "Alle verkoopfacturen" to
  route AccountsReceivable
- **THEN** "Alle verkoopfacturen" shows beside the strip, and clicking it routes to AccountsReceivable

#### Scenario: The link changes with the tab

- **WHEN** the reader opens a tab whose widget declares no header link
- **THEN** no link shows beside the strip, and opening a tab whose widget declares "All reminder runs" shows that one
