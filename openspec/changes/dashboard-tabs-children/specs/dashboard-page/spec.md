# dashboard-page Delta: dashboard-tabs-children

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dashboard-tabs-children](../../)

## Purpose

A tabs widget works on a dashboard page as it does on a detail page.

## ADDED Requirements

### Requirement: A tabs widget on a dashboard renders the widgets its tabs name

A dashboard page SHALL give a container widget (registry `container: true`) the page's widget definitions, those of
the chosen view included, the consumer registry and the page's surface. Each tab SHALL render the widget its
`widgetId` names, and every widget of a `widgetIds` stack. A tab with `countFrom: "widget"` SHALL count the child's
list, read from `content.register` / `content.schema` / `content.filter` or from `content.source`. A child SHALL
resolve its renderer as the dashboard grid does (the type as written before its alias). A leaf widget SHALL receive
none of these bindings.

#### Scenario: Two tabs over two tables

- **GIVEN** a dashboard with a `tabs` widget whose tabs name the `object-table` widgets `accounts` and `statements`
- **WHEN** the page renders
- **THEN** the first tab shows the accounts table, and opening the second shows the statements table
- **AND** no tab reads "No widget found"

#### Scenario: A count on the tab

- **GIVEN** the tab declares `countFrom: "widget"` and its table has `content.source` `{ register, schema, filter }`
- **WHEN** the list holds 4 rows
- **THEN** the tab shows the count 4
