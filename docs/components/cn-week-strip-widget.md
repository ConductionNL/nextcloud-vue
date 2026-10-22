# CnWeekStripWidget

The current week as day columns, with the dated items listed under each day. Use it for deadlines, appointments or anything else somebody should see coming. Registered under the `week-strip` type and configured by [`CnWeekStripWidgetForm`](./cn-week-strip-widget-form.md).

- Five working days by default. Set `days: 7` to add the weekend.
- Today's column is highlighted and carries a "today" badge.
- An item that is late gets a marked edge and the word "Late".
- A day without items shows `emptyText`.
- On a narrow screen the strip scrolls sideways. The scroll area takes keyboard focus. Under the board look (`.cn-look-board`) the days wrap into rows of days at least 120px wide instead, and do not scroll.

Items come from an OpenRegister source or from static `items`. A source costs one request for the whole week.

## Manifest

```json
{
  "widgetKey": "week-strip",
  "slot": "body",
  "gridX": 0, "gridY": 0, "gridWidth": 8, "gridHeight": 3,
  "props": {
    "content": {
      "source": { "register": "dossiq", "schema": "case", "filter": { "assignee": "@me" } },
      "dateField": "deadline",
      "titleField": "title",
      "metaFields": ["identifier", "caseType"],
      "itemRoute": "CaseDetail",
      "emptyText": "No deadlines"
    }
  }
}
```

With static items:

```json
{
  "widgetKey": "week-strip",
  "props": {
    "content": {
      "days": 7,
      "items": [
        { "title": "Council meeting", "meta": "Town hall", "date": "2026-10-07", "route": "Meetings" },
        { "title": "Budget deadline", "date": "2026-10-09", "href": "https://example.org/budget", "late": true }
      ]
    }
  }
}
```

## Content shape

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `days` | `5 \| 7` | `5` | Working days, or the whole week. The week starts on Monday. |
| `source` | `{ register, schema, filter?, limit? }` | none | The OpenRegister source. `filter` takes the shared @-token grammar (`@me`, `@today`). `limit` caps the request (default 100). |
| `dateField` | `string` | none | The field the items are bucketed by. Required with a source. |
| `titleField` | `string` | the object's display name | The field shown as the item title. |
| `metaFields` | `string[]` | `[]` | Fields shown under the title, joined with a middle dot. |
| `itemRoute` | `string` | none | Route name an item links to. The record id goes in `params.id`. |
| `lateWhen` | `{ op, value }` | `{ "op": "lt", "value": 0 }` | Rule on the number of days until the date. The default marks dates before today. `{ "op": "lte", "value": 0 }` also marks today. |
| `lateField` | `string` | none | A boolean field that marks a record late, whatever its date. |
| `items` | `Array<{ title, meta?, date, route?, href?, late? }>` | `[]` | Static items, used when there is no source. |
| `emptyText` | `string` | "Nothing planned" | Text of a day without items. |
| `weekOffset` | `number` | `0` | Whole weeks from the current one (`1` is next week). |
| `maxPerDay` | `number` | none | The most items a day shows. The rest sit behind "+N more". Without it a day shows all its items and grows with them. |
| `moreRoute` | `string \| object` | none | Where "+N more" leads: a route name or a route object (the full list). Without it "+N more" is a button that opens the day in place, and "Show less" closes it. |
| `moreLabel` | `string` | "+N more" | Text of the control, with `{count}` for the number hidden. Goes through the host's translate. |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The configuration blob described above. |
| `translate` | `function` | `null` | Translate function for `emptyText` and static item texts. Falls back to the injected `cnTranslate`. |
| `now` | `Date` | `null` | The moment the strip treats as now. Leave empty for the current time. |

## Accessibility

- The days are an ordered list. Today's column has `aria-current="date"`.
- Each item with a route is a link, reachable with Tab.
- A late item says "Late" in text. The coloured edge only adds emphasis.
- The scroll area is a labelled region with `tabindex="0"`, so the arrow keys scroll it. Under the board look the days wrap and there is nothing to scroll.

## `content.inset`

`inset: true` draws the strip inside the board's inset (16px above, 24px at the sides, 22px below; theme hook `--cn-widget-board-inset`) instead of from card edge to card edge. Off by default.

## As a week view

With an `endpointSource` the strip reads its items from an app endpoint for the days it shows, and becomes a timetable: previous, next and back to today, a Today / Week switch, times, status badges and actions per item.

```json
{
  "type": "week-strip",
  "content": {
    "heading": "My timetable",
    "endpointSource": { "url": "/apps/learniq/api/timetable/mine", "params": { "from": "@range.from", "to": "@range.to" } },
    "itemsPath": "sessions",
    "dateField": "startsAt",
    "titleTemplate": ["{title}", "Untitled lesson"],
    "metaTemplates": ["{room.name}"],
    "timeFields": { "start": "startsAt", "end": "endsAt" },
    "badgeField": "lifecycle",
    "variantMap": { "cancelled": { "label": "Cancelled", "variant": "error", "muted": true } },
    "itemActions": [
      { "id": "join", "label": "Join", "href": "@item.onlineMeetingUrl", "target": "_blank", "visibleWhen": { "field": "item.onlineMeetingUrl", "op": "notEmpty" } },
      { "id": "note", "label": "Add note", "type": "open-modal", "target": "LessonNoteDialog", "props": { "session": "@item" } }
    ],
    "itemLists": [{ "path": "standby", "dateField": "date", "titleTemplate": "Standby", "timeFields": { "start": "startsAt", "end": "endsAt" } }],
    "navigation": true,
    "modes": true,
    "notices": [{ "path": "source", "equals": "planninq", "text": "These lessons come from the school timetable." }],
    "summary": { "title": "Today's changes", "path": "changes", "itemTitle": "{title}", "itemMeta": ["{changeReason}"] },
    "weekEmptyText": "No lessons this week"
  }
}
```

| Key | Meaning |
|-----|---------|
| `endpointSource` | `{ url, params?, responsePath? }`. `@range.from` is the first day shown and `@range.to` the day after the last (`YYYY-MM-DD`). `@workspace.<key>` reads the dashboard's workspace, so a `workspace-filter` on the page picks whose week is shown; a required token without a value holds the read. Read again when the shown days or the workspace change, and on a page refresh. |
| `itemsPath`, `itemLists` | The list of items in the answer (default `items`), and more lists of the same answer, each with its own item keys (`path`, `dateField`, `titleTemplate`, `timeFields`, ...). |
| `titleTemplate`, `metaTemplates` | Templates as in a record list; a list in place of a template is candidates, the first that fills. |
| `timeFields` | `{ start, end }`: an ISO moment or `HH:MM`, drawn as "09:00–09:50" in the Nextcloud locale. A day's items sort by start. |
| `badgeField`, `variantMap` | A badge from the item's value: `{ <value>: { label, variant: info, success, warning or error, muted? } }`. `muted` strikes the title through. |
| `badges` | More badges, `[{ field, variantMap }]`, each drawn when the item's value has a label in its map. A boolean reads as `"true"` or `"false"`: `{ "field": "cover", "variantMap": { "true": { "label": "Cover" } } }`. |
| `itemActions` | Actions per item as CnActionButtons draws them. `@item` and `@item.<path>` fill from the item (see [fillItemTokens](../utilities/fill-item-tokens.md)); `visibleWhen` is a local condition over `item.<path>`. |
| `itemRoute`, `itemRouteWhen` | The detail route an item links to, and a local condition on the item for the link. |
| `navigation`, `modes`, `defaultMode`, `heading` | Previous / next / back to today; a Today / Week switch, starting on `defaultMode`; a heading. |
| `notices` | `[{ path, equals?, notEquals?, missing?, type?, text }]`: notes when the rule holds on the answer. The `notice` slot takes more. |
| `summary` | `{ title, path, itemTitle, itemMeta?, badgeField?, variantMap? }`: a list above the days of the answer's entries at `path`. |
| `weekEmptyText` | Drawn in place of the days when none has an item. |
