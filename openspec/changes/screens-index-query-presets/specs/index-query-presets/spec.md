# index-query-presets Delta: screens-index-query-presets

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-index-query-presets](../../)

## Purpose

A menu query preset on an index page with its own lenses, columns and copy.

## ADDED Requirements

### Requirement: A query preset overlays lenses, columns and copy

An index page SHALL accept `config.queryPresets`, a list of presets each with a
`match` object of route query pairs. When every pair of a preset's `match` is
in the current route query (a repeated parameter matching when it holds the
value), the first such preset SHALL replace the page's `title`,
`quickFilters`, `columns`, `cardFields`, `countText`, `searchPlaceholder`,
`footerNote`, `defaultSort` and `viewSwitch` with its own values where it
declares them. A preset SHALL NOT change any other key; the schema SHALL
refuse other keys in a preset and a preset without `match`. The page SHALL
remount when the matching preset changes. Without a match, or without the
key, the page SHALL render its own config.

#### Scenario: The Woo requests entry

- **GIVEN** the Cases page with a preset `match: { caseType: "<woo uuid>" }`, its own six lenses, seven columns and title "Woo requests", and a menu entry linking to `/cases?caseType=<woo uuid>`
- **WHEN** the person opens that entry
- **THEN** the list shows the six lenses, the seven columns and the title "Woo requests", over the same register and schema

#### Scenario: The plain Cases entry

- **GIVEN** the same page opened without the query
- **WHEN** it renders
- **THEN** it shows the Cases lenses, columns and title
