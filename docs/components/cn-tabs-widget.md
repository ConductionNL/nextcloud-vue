import GeneratedRef from './_generated/CnTabsWidget.md'

# CnTabsWidget

A widget that holds other widgets, one per tab.

## Why it exists

A case detail page that carries notes, files, related records, sub-records, mail and appointments renders six cards, each with its own header and its own Actions menu, stacked down the page. All six describe one record, and only one of them is being read at a time.

`CnTabsWidget` puts them behind a tab strip. The strip takes over the two things the cards were each doing separately: it shows the title, and it draws the card.

## What the children give up

A child renders through [`CnDetailWidgetHost`](./cn-detail-widget-host.md) with `chrome="bare"`, so it draws no header and no border of its own. Its content fills the panel exactly as it filled its card. The tab label is what the card header used to say.

The Actions menu moves out of the panels and into the tab bar, beside the strip rather than inside it, and rebinds to whichever child is showing. One menu, always acting on what you are looking at. Refresh reaches that child's own fetch over `cn:widget:refresh`, not a sibling's.

The menu renders through the strip's `#nav-end` slot, which is a sibling of the `role="tablist"` element. Anything nested inside a tablist is announced as one of the tabs, so a screen-reader user counting six tabs would otherwise hear seven.

## What the open panel lends to the menu

Some widgets carry items that live only in their own overflow menu. [`CnObjectDataWidget`](./cn-object-data-widget.md) carries two: Metadata, and the full edit dialog. A panel draws no header, so suppressing its menu left both with nowhere to go. Metadata had no other home anywhere. Edit had a near neighbour, the record Edit button in a detail page header, but that opens the form the page configures rather than the field subset the widget declares.

The open panel now publishes those items and the strip renders them under the built-in Refresh and Request a feature. Switch tabs and they go with the panel, because the strip keeps them per widget id. A visited tab stays mounted, so more than one panel publishes at a time and only the open one's items are offered.

The strip renders the items. It does not rebuild them. Each one carries a callback that reaches the widget that published it, so Edit still opens that widget's dialog with that widget's `overrides`, `include` and `exclude` applied, and still saves through that widget's own path. Rebuilding the dialog on the strip would drop all of it.

A widget that keeps its own header publishes nothing, which is every surface except a tab panel. The channel itself is an internal module, `src/utils/panelActions.js`, and it documents the shape a widget publishes.

## Without the Actions menu

The strip draws one Actions menu beside the tabs. A page that draws none, as the boards do, turns it off on the tabs widget's content:

```json
{
  "id": "receivables-tabs",
  "type": "tabs",
  "content": {
    "showActions": false,
    "tabs": [{ "widgetId": "open-invoices", "label": "Open balance" }]
  }
}
```

The whole menu goes, including the items an open panel lends it (a data widget's Metadata and Edit). Without the key the menu stays as it is.

## Usage

Reference it from a manifest placement. `label` and `icon` are optional and fall back to the child widget's own title and icon, so the common case is a list of `widgetId`s:

```json
{
  "id": "case-panels",
  "type": "tabs",
  "content": {
    "ariaLabel": "Case details",
    "tabs": [
      { "widgetId": "case-notes", "label": "Notes" },
      { "widgetId": "case-files", "label": "Files" },
      { "widgetId": "case-related" },
      { "widgetId": "case-sub-cases" }
    ]
  }
}
```

### The open panel's header link

A widget that declares `headerLink` keeps it inside a tab. A panel draws no card header, so the strip draws the open tab's link beside it, before the Actions menu, and switches it with the tab. A tab whose widget declares none shows no link. The link is read from `headerLink` on the widget definition, else from its content (`content.headerLink`, or `viewAllRoute`). For a stack, the first widget's link counts; each card below it draws its own link in its card header.

A single widget's `headerActions` (see [CnWidgetWrapper](./cn-widget-wrapper.md#buttons-in-the-header-headeractions)) are drawn in its panel's heading, beside the title, or on a row of their own above the panel when the panel has no heading.

```json
{
  "id": "open-invoices",
  "type": "object-table",
  "headerLink": { "label": "All sales invoices", "route": "AccountsReceivable" }
}
```

A `route` is a router link (with optional `params` and `query`), an `href` a plain anchor, and the label goes through the app's translations. Nothing changes on the tabs widget itself.

### Counts, and tabs under More

A tab can show a count, and a strip can keep to a few tabs and put the rest under a "More" menu:

```json
{
  "id": "case-panels",
  "type": "tabs",
  "content": {
    "ariaLabel": "Case details",
    "maxVisibleTabs": 5,
    "hideEmpty": true,
    "moreLabel": "More",
    "tabs": [
      { "widgetId": "case-overview", "label": "Overview" },
      { "widgetId": "case-files", "label": "Documents", "countField": "documents" },
      { "widgetId": "case-contact", "label": "Contact", "countField": "messages" },
      { "widgetId": "case-tasks", "label": "Tasks", "count": 1 },
      { "widgetId": "case-history", "label": "History" },
      { "widgetId": "case-archiving", "label": "Archiving", "overflow": true }
    ]
  }
}
```

| Key | On | What it does |
| --- | --- | --- |
| `count` | a tab | A number shown after the label. |
| `countField` | a tab | Reads the count off the record. A list counts its items, a number is used as is, a missing field counts as 0. |
| `countFrom` | a tab | Counts a list on the server when the record does not carry the number: `"widget"` counts the child widget's own list (its `content.register`, `content.schema` and `content.filter`, with `@objectId` and other tokens resolved), an object with `register`, `schema` and an optional `filter` names the list. One request per tab (`_limit=1`, the response's `total`), again when the record changes or the page refreshes. `count` and `countField` win over it; a failed count shows no number. |
| `overflow` | a tab | Lists the tab under "More". |
| `default` | a tab | `true` opens the strip on this tab, so an Overview tab can stay first while the page opens on another. A route hash naming a tab wins over it, and a marked tab under "More" is not opened. |
| `maxVisibleTabs` | `content` | The most tabs the strip shows. Later tabs go under "More". A tab that is already there does not use up a place. |
| `hideEmpty` | `content` | Moves a tab whose count is 0 under "More". A tab without a count is never moved. |
| `moreLabel` | `content` | Names the menu. Defaults to "More". |

The strip opens on the tab marked `default`, else on the first tab that is in it. None of these keys is required, and a strip that sets none renders as before.

Tab titles are separately configurable for a reason: "Files and attachments" reads fine on a card and is too long once six tabs share the width. [`CnTabsWidgetForm`](./cn-tabs-widget-form.md) edits them in Buildiq edit mode.

### A title row for a single widget

A tab that holds one widget draws that widget's own `title` as a heading in its panel, with its `description` on a line under it, both through the app's translate (board DqZaakDocumenten: tab "Documenten", heading "Documenten bij dit verzoek"). A widget without a title or without a description, or whose title the tab already shows, draws no heading: a title alone repeats what the tab names, so the widget stays bare in its panel.

### A stack of widgets in one tab

A tab can hold several widgets with `widgetIds` instead of `widgetId`. The
Overview of a person or organisation page shows the record's card, then its
open cases, then its latest contact moments, and only on that tab:

```json
{ "widgetIds": ["person-card", "person-cases", "person-moments"], "label": "Overview" }
```

By default the widgets stand one under the other. To lay them out in a grid,
for example four KPI tiles in a row, give the tab `columns` (each widget takes
that share of a 12-column row) and/or `layout`, the page grid's width key per
widget (`gridWidth`, of 12; a widget it does not name takes the `columns` share,
or the whole row). Widgets wrap onto the next row, and below 700px the stack is
vertical again:

```json
{ "widgetIds": ["kpi-a", "kpi-b", "kpi-c", "kpi-d", "list"], "label": "Overview", "columns": 4,
  "layout": [{ "widgetId": "list", "gridWidth": 12 }] }
```

Every widget renders as a titled card without its own Actions menu (the strip's
Actions button serves the tab). In the board look the panel draws no frame of
its own: the first card joins the open tab and the next ones stand 20px apart.
An id that names no widget is skipped. Without `label` the tab takes the first
widget's title. `countFrom: "widget"` counts the first widget of the stack that
has a list. A `widgetId` tab renders as before.

A widget in a stack follows the page controls. On a dashboard, a widget whose
`visibleWhen` is a workspace condition (`{ "workspace": "<key>", "op", "value" }`)
draws only while the condition holds, the same rule a dashboard widget follows.
So chips at the top of a tab can switch the lists below them:

```json
{ "widgetIds": ["round-chips", "round-all", "round-paused"], "label": "Reminder runs", "countFrom": "widget" }
```

with `"visibleWhen": { "workspace": "round", "value": "paused" }` on
`round-paused`. Off a dashboard there is no workspace, and every widget of the
stack draws. The tab count still reads the first widget of the stack that has
a list, whichever one is showing.

On a detail page a widget in a stack also follows its own `visibleWhen` against
the record, the way a grid widget does: a field of the record, or of a record
the page's `visibilityContext` names (`@context.<name>`). It is hidden while
those records load. So a contact-moment card shows only on interaction tickets:

```json
{ "id": "ticket-interaction", "type": "custom", "visibleWhen": { "field": "kind", "op": "eq", "value": "interaction" } }
```

A condition that needs a request (`source` or `endpoint`) is not evaluated on a
stack child; the widget draws.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `content` | `Object` | `{}` | The widget config: `{ tabs, ariaLabel, variant? }`. `variant: "segmented"` draws the strip as a pill switch (CnTabs' segmented variant); the default is the line strip. `tabs[]` entries are `{ widgetId, label?, icon? }` or `{ widgetIds, label?, icon?, columns?, layout? }`, or a bare widget-id string. |
| `availableWidgets` | `Array` | `[]` | Every widget definition on the surface, so `content.tabs[]` can reference siblings by id. |
| `objectId` | `String \| Number` | `''` | The bound record's id. |
| `objectData` | `Object` | `null` | The loaded record, or null while it is still being fetched. |
| `objectType` | `String` | `''` | The resolved object-type slug. |
| `schemaObject` | `Object` | `null` | The resolved JSON Schema, needed by a `data` child. |
| `register` | `String \| Object` | `''` | OpenRegister register slug of the surface. |
| `schema` | `String \| Object` | `''` | OpenRegister schema slug of the surface. |
| `store` | `Object` | `null` | The effective object store. |
| `surface` | `String` | `'detail-page'` | Rendering surface forwarded to integration children (AD-19). |
| `integrationContext` | `Object` | `null` | Object context forwarded to integration children. |
| `cnRegistry` | `Object` | `{}` | The consumer's component registry, for custom child widget types. |
| `showActions` | `Boolean` | `true` | `false` drops the strip's Actions menu, the open panel's own items included. From a manifest: `content.showActions`. |
| `showRefresh` | `Boolean` | `true` | Show Refresh in the hoisted Actions menu. |
| `showRequestFeature` | `Boolean` | `true` | Show Request a feature in the hoisted Actions menu. |
| `showDocumentation` | `Boolean` | `true` | Show Documentation in the hoisted Actions menu. |
| `documentationUrl` | `String` | `''` | Documentation URL for the hoisted Actions menu. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `geo-saved` | `object` | Re-emitted from a geo child that saved a geometry. |
| `open-integration` | `string` | Re-emitted from a related child asking to open an integration. |
| `select-object` | `object` | Re-emitted from a related child whose object row was clicked; payload is the raw object. |

## Notes

- **Panels are lazy, and stay mounted.** Each panel is a [`CnTab`](./cn-tab.md) with `lazy`, so a child mounts when its tab is first opened. Six eager panels that each fetch on `mounted()` would fire six requests on page load to answer five questions nobody asked. Once opened, a panel stays mounted, so switching back never refetches.
- **A tab naming a widget that does not exist still renders**, and its panel says which id did not resolve. `content.tabs[]` is hand-authored config, and a typo that silently removes a tab is a typo nobody finds.
- **A tabs widget cannot hold another tabs widget.** Two rows of tabs give the reader no way to tell which row owns the panel, so the config form filters containers out of the picker.

## See also

- [`CnTabs`](./cn-tabs.md) and [`CnTab`](./cn-tab.md) for the strip itself
- [`CnDetailWidgetHost`](./cn-detail-widget-host.md) for how a child is rendered
- [`CnTabsWidgetForm`](./cn-tabs-widget-form.md) for the config form

<GeneratedRef />

## What is new on a tab

A tab that declares neither `count` nor `countField` shows what is new on it, from the object's `@self.unreadCounts[<unreadKey>]` (OpenRegister `object-read-state`, returned on the detail read). `unreadKey` defaults to the tab's `id`, else its `widgetId`. A key absent from the map, or 0, shows no badge. A tab with its own `count` or `countField` keeps it. Opening a tab marks nothing: the backend tracks one moment per record.

With `content.badgeSource: "readState"` opening a tab does mark its part read: the widget sends `PUT .../read-state` with `{ subResource: <unreadKey> }`, once, and drops that tab's count. A refused write keeps the count. A screen reader hears "3 new" after the tab's name, as the count alone is a bare number. The record's own read state stays the detail page's (`markRead`, "Mark as unread").

```json
{ "tabs": [{ "widgetId": "files" }, { "id": "documents", "widgetId": "docs", "unreadKey": "files" }] }
```

## Hiding a tab: `visibleWhen`

A tab entry can carry `visibleWhen`, the shared predicate every other surface uses (`{ field, op, value }`, or `{ source, field: "@total", op, value }`). A tab whose condition is false is absent from the strip, not empty. A tab without the key always renders.

```json
{ "tabs": [
  { "id": "overview", "widgetId": "case-overview" },
  { "id": "participants", "widgetId": "case-roles",
    "visibleWhen": { "source": { "register": "dossiq", "schema": "role", "filter": { "case": "@objectId" } }, "field": "@total", "op": "gt", "value": 0 } },
  { "id": "decision", "widgetId": "case-decision",
    "visibleWhen": { "field": "decision", "op": "neq", "value": null } }
] }
```

- **Local form** (a `field` of the page object): decided on every change of the object. While the object is still loading the tab shows disabled.
- **Source form** (`source` with `@total`): counted once on mount, when the record changes, and again when a write is reported on the page (a `cn:page:refresh` or `cn:widget:refresh` broadcast, which the object-list widgets send after they save). While the count is pending the tab shows disabled with a spinner, so the strip does not jump; a refresh keeps the last answer until the new one arrives.
- **A tab keeps its panel.** A tab is keyed on its `id`, else its place in `content.tabs`, not on the widget it starts with. A stack whose first card turns visible once the record arrives (DqBezwaar) keeps its panel, its place and, when it is open, the open state. Give tabs an `id` when their order can change.
- **The active tab is always visible.** When the active tab goes, the first visible tab takes over and, if the page was opened with a route hash, the hash follows. A hash naming a hidden tab opens the first visible tab, without an error; a hash naming a visible tab (`#decision`, the tab's `id`) opens it.

## The board look

In the board look the widget draws no tab icons and no "More" menu, draws its Actions button as a secondary button, and names the tab list from the page's `tabsLabel` (`content.ariaLabel` still wins). A tab holding the record's activity (an `audit-trail` or `timeline` widget, or the `activity` integration) is labelled "History" unless the tab sets a label, and is moved to the end of the strip whatever its place in `content.tabs`.

### Overflow tabs in the Actions menu

In the board look `overflow`, `maxVisibleTabs` and `hideEmpty` still decide which tabs leave the strip, but those tabs are listed at the top of the Actions menu beside the strip instead of under "More" (boards DqZaakMeer and DqZaakBesluiten). The History tab always stays in the strip and holds one of the `maxVisibleTabs` places. A tab picked from the menu opens, takes focus, and is drawn just before the last tab while it is open. With `showActions: false` the menu still renders while there are tabs to list, holding only those tabs.

```json
{
  "maxVisibleTabs": 5,
  "tabs": [
    { "widgetId": "case-overview", "label": "Overview" },
    { "widgetId": "case-files", "label": "Files" },
    { "widgetId": "case-contact", "label": "Contact" },
    { "widgetId": "case-tasks", "label": "Tasks" },
    { "widgetId": "case-history", "label": "History" },
    { "widgetId": "case-notes", "label": "Notes", "overflow": true },
    { "widgetId": "case-decisions", "label": "Decisions", "overflow": true }
  ]
}
```
