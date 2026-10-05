# CnWeekStripWidget

The current week as day columns, with the dated items listed under each day. Use it for deadlines, appointments or anything else somebody should see coming. Registered under the `week-strip` type and configured by [`CnWeekStripWidgetForm`](./cn-week-strip-widget-form.md).

- Five working days by default. Set `days: 7` to add the weekend.
- Today's column is highlighted and carries a "today" badge.
- An item that is late gets a marked edge and the word "Late".
- A day without items shows `emptyText`.
- On a narrow screen the strip scrolls sideways. The scroll area takes keyboard focus.

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
- The scroll area is a labelled region with `tabindex="0"`, so the arrow keys scroll it.
