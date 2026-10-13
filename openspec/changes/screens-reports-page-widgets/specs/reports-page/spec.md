# reports-page Delta: screens-reports-page-widgets

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-reports-page-widgets](../../)

## Purpose

A reports page can show a report's key figures on the page itself, under the cards that open the reports.

## ADDED Requirements

### Requirement: A reports page draws widgets under its cards

A `type: "reports"` page with `widgets` SHALL draw them under its report cards as a dashboard grid placed by `layout`
(each widget a full row when there is no layout), without a second page header. A reports page without `widgets`
SHALL render as before.

#### Scenario: Meetings and efficiency

- **GIVEN** a reports page with two cards and a stat widget titled "Vergaderingen en efficiëntie" with `headerLink` "Hele rapportage" and `note` "20 raad, 38 commissie"
- **WHEN** the page renders
- **THEN** under the cards a card "Vergaderingen en efficiëntie" shows the link, the figure and the sub-line
