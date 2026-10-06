# zuiddrecht-pixel-gaps Delta: zuiddrecht-pixel-gaps

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [zuiddrecht-pixel-gaps](../../)

## Purpose

Close the gaps between the Zuiddrecht design boards and what the shared
library draws, without changing any app that does not opt in.

## ADDED Requirements

### Requirement: A navigation primary action runs a page action

`nav.primaryAction` and `pages[].primaryAction` SHALL accept an `action`
object with the shape of a page action (`$defs/action`: `type`, `register`,
`schema`, `route`, ...). When `action` is set, CnAppNav SHALL render the
button through CnActionButtons so the action is dispatched (an `open-form`
action opens the create dialog) instead of only emitting an event. A
primary action MAY also set `solid: true` to render as a full-width primary
button whatever its form. Without `action` or `solid` the button SHALL render
as it does today.

#### Scenario: An open-form primary action opens the create dialog

- **GIVEN** `nav.primaryAction: { label: "New case", action: { id: "new-case", type: "open-form", register: "dossiq", schema: "case" } }`
- **WHEN** the navigation renders
- **THEN** the primary action is a CnActionButtons entry with `type: "open-form"` and `variant: "primary"`

#### Scenario: A primary action without an action is unchanged

- **GIVEN** `nav.primaryAction: { label: "New", route: "Cases" }`
- **WHEN** the navigation renders
- **THEN** it renders the same link button as before and no CnActionButtons

### Requirement: A menu entry counts a filtered list

`menu[].count` SHALL accept an object `{ register, schema, filter? }`. CnAppRoot
SHALL fetch the total of that register and schema with the filter applied
(filter tokens such as `@me` resolved at fetch time) under a store key of its
own, so the whole-schema total of an index page is not overwritten, and SHALL
provide the result per menu entry id as `cnMenuItemCounts`. CnAppNav SHALL
render that total in the entry's counter bubble. An integer or `"auto"` count
SHALL behave as before.

#### Scenario: A filtered count renders in the bubble

- **GIVEN** a menu entry `{ id: "mine", count: { register: "dossiq", schema: "case", filter: { assignee: "@me" } } }`
- **AND** `cnMenuItemCounts.mine` is 6
- **WHEN** the navigation renders
- **THEN** the entry's counter reads 6

#### Scenario: The fetch carries the filter and its own store key

- **GIVEN** the same entry
- **WHEN** CnAppRoot hydrates menu counts
- **THEN** it registers a store type that is not the index page's slug and fetches with `_limit: 1` plus the resolved filter

### Requirement: A dashboard page can hide its header

CnDashboardPage SHALL take a `showHeader` prop (default `true`). With
`config.showHeader: false` on a dashboard page the header row (title,
description, header actions, edit toggle) SHALL not render; the title SHALL
still be present as a visually hidden heading so the main landmark keeps its
name.

#### Scenario: Header hidden

- **GIVEN** a dashboard page with `config.showHeader: false`
- **WHEN** it renders
- **THEN** no `cn-dashboard-page-header` test id is in the DOM and a visually hidden heading carries the title

### Requirement: A widget header carries a text link

A widget entry SHALL accept `headerLink: { label, route?, params?, query?, href? }`.
CnWidgetWrapper SHALL take a `headerLink` prop and render it as a text link in
the header's actions group, before the overflow menu. CnDashboardPage SHALL
forward the entry's `headerLink` to the wrapper. Without `headerLink` nothing
changes.

#### Scenario: A route link renders

- **GIVEN** a widget with `headerLink: { label: "All deadlines", route: "Cases" }`
- **WHEN** the wrapper renders with a router
- **THEN** a `cn-widget-wrapper-header-link` link with that text points at the route

### Requirement: An index page title is a manifest key

An index page SHALL show its title from `config.showTitle: true` (the existing
prop, now documented in the schema) and SHALL accept `config.countSubtitle`
(a text with `{total}`, rendered under the title with the collection's
total) and `config.headerActions` rendered as buttons beside the title.
Without these keys nothing changes.

#### Scenario: Count subtitle

- **GIVEN** `config.showTitle: true` and `config.countSubtitle: "{total} open cases"`
- **AND** the collection total is 48
- **WHEN** the page renders
- **THEN** the header's description reads "48 open cases"

### Requirement: A table column carries a secondary line

A column definition SHALL accept `secondary`: a field key, a template with
`{field}` placeholders, or a function of the row. CnDataTable SHALL render its
value under the cell's primary value as `cn-table-cell__secondary`. Columns
without `secondary` render as before.

#### Scenario: Template secondary

- **GIVEN** a column `{ key: "title", secondary: "{number} · {requester}" }`
- **AND** a row `{ title: "Lighting", number: "2026-0082", requester: "S. de Vries" }`
- **WHEN** the table renders
- **THEN** the cell shows "Lighting" and a secondary line "2026-0082 · S. de Vries"

### Requirement: The audit-trail widget reads the app-wide feed

CnAuditTrailWidget SHALL render CnAuditTrailCard in `global` mode when it
resolves no object id: the card then fetches the global audit-trail endpoint
(`/audit-trails`) filtered on the resolved register and schema when set. With
an object id the widget SHALL behave as before.

#### Scenario: No object id

- **GIVEN** a dashboard widget `{ widgetKey: "audit-trail", props: { register: "dossiq", schema: "case" } }`
- **WHEN** it renders
- **THEN** the card fetches `/audit-trails?register=dossiq&schema=case&_limit=...` instead of rendering nothing

### Requirement: A detail page drops its eyebrow and shows a breadcrumb

A detail page SHALL accept `config.showTypeEyebrow: false` to suppress the
type eyebrow, and `config.breadcrumb: { label, route?, params?, href? }`
to render a breadcrumb trail above the header: the given crumb, then the
record's display name as the current crumb. Without these keys nothing
changes.

#### Scenario: Breadcrumb

- **GIVEN** `config.breadcrumb: { label: "All cases", route: "Cases" }` and a record named "2026-0082"
- **WHEN** the page renders
- **THEN** a breadcrumb trail reads "All cases / 2026-0082" above the header

### Requirement: The navigation carries a card and a help entry

`nav.card` SHALL render a card above the footer region: `{ title, text?, link?: { label, route?, href?, action? } }`.
`nav.help` SHALL render a footer entry `{ label, href?, route? }` with a help
icon above the settings foldout. A `#card` slot SHALL replace the card.
Without these keys nothing changes.

#### Scenario: Card with a route link

- **GIVEN** `nav.card: { title: "Close out your day", text: "...", link: { label: "To the day close", route: "DayClose" } }`
- **WHEN** the navigation renders
- **THEN** a `cn-nav-card` block shows the title, the text and a router link

### Requirement: A resolved reference is not drawn as a uuid

CnCellRenderer SHALL add the `cn-cell-renderer--uuid` class only when the
value it displays is itself a uuid. A `format: uuid` property whose displayed
value resolved to a name SHALL render in the normal text style.

#### Scenario: Resolved name

- **GIVEN** a property `{ format: "uuid" }` and a displayed value "Woo request"
- **WHEN** the cell renders
- **THEN** it does not carry `cn-cell-renderer--uuid`

### Requirement: The brand block takes an emblem

`nav.brand.emblem` SHALL accept an image URL rendered in the brand block in
place of `logo`, or `true` to draw the theme's emblem from the
`--nldesign-emblem-url` custom property. The emblem is decorative beside a
name.

#### Scenario: Emblem URL

- **GIVEN** `nav.brand: { emblem: "/apps/dossiq/img/emblem.svg", name: "dossiq", caption: "Gemeente Zuiddrecht" }`
- **WHEN** the navigation renders
- **THEN** the brand block draws the emblem image and no logo

### Requirement: A greeting header switches views

The header widget SHALL accept `content.views: { ariaLabel?, options: [{ label, route, params? }] }`
and render a CnSegmentedControl at the right of the heading. The checked
option is the one whose route is current; choosing another pushes its route.

#### Scenario: Two views

- **GIVEN** `content.views.options` "My work" (route Dashboard) and "My team" (route TeamDashboard) and the current route is Dashboard
- **WHEN** the widget renders
- **THEN** a segmented control shows both with "My work" checked, and choosing "My team" pushes TeamDashboard

### Requirement: A stat tile colours its caption by a rule

CnStatWidget SHALL accept `content.captionVariant` and, on each
`content.overrides[]` entry, `caption` and `captionVariant`. The caption SHALL
carry `cn-kpi-card__label--<variant>` and the override's caption SHALL
replace the tile's.

#### Scenario: Override caption

- **GIVEN** `overrides: [{ when: { field: "value", op: "gte", value: 1 }, caption: "{value} due today", captionVariant: "error" }]`
- **AND** the value is 1
- **WHEN** the tile renders
- **THEN** the caption reads "1 due today" with the error class

### Requirement: A tabs widget renders a segmented strip

CnTabsWidget SHALL forward `content.variant` (`line` default, `segmented`) to
CnTabs.

#### Scenario: Segmented

- **GIVEN** `content.variant: "segmented"`
- **WHEN** the widget renders
- **THEN** the strip carries `cn-tabs--segmented`

### Requirement: A plain schema slug is left as written

`schemaRefSlug` SHALL kebab-case only a `$ref` title: a value with a capital
initial, or one carrying spaces or punctuation. A value that starts with a
lowercase letter or digit and holds only letters, digits and dashes is a
slug and SHALL be returned as written, so a camelCase slug such as
`statusType` reaches OpenRegister unchanged.

#### Scenario: camelCase slug

- **GIVEN** `source.schema: "statusType"`
- **WHEN** `resolveObjectOpType` resolves the type
- **THEN** the schema segment is `statusType`, not `status-type`

#### Scenario: Title

- **GIVEN** a `$ref` of `ReportPeriod`
- **WHEN** it is slugified
- **THEN** the result is `report-period`

### Requirement: A stages widget draws bars

CnStagesWidget SHALL accept `content.variant: "bars"`: an ordered list of
equal columns, each step a thin bar coloured by state (done: primary,
current: accent, to do: border, all from tokens), the label under it
(current bold, done semi-bold, to do muted) ellipsized with a title
attribute, an optional date line from the source's `dateField`, no
description, and a visually hidden "(current step)" on the current one.
Clicking a step moves the record as the dot strip does. Without the key the
dot strip SHALL render as before.

#### Scenario: Bars

- **GIVEN** `variant: "bars"` and three stages with the second current
- **WHEN** the widget renders
- **THEN** three list items carry the states done, current and todo, no description is drawn, and the current label carries the hidden text

### Requirement: An app root can hide its menu

CnAppRoot SHALL take a `hideMenu` prop (default `false`). When true, neither
the default CnAppNav nor the `#menu` slot renders, so the content starts at
the left edge. By default the navigation renders exactly as before.

#### Scenario: Default

- **GIVEN** a manifest with a menu and no `hideMenu`
- **WHEN** the root renders its shell
- **THEN** CnAppNav renders with the menu manifest

#### Scenario: Hidden

- **GIVEN** `hideMenu: true`
- **WHEN** the root renders its shell
- **THEN** no CnAppNav and no `#menu` slot content is in the DOM
