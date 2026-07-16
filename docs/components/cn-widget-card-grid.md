# CnWidgetCardGrid

`CnWidgetCardGrid` is the built-in v2 widget that renders a grid of
[CnObjectCard](./cn-object-card.md) items. It replaces the
v1.3.0 `cardComponent` field pattern with a manifest-driven entry.

## Import

```js
import { CnWidgetCardGrid } from '@conduction/nextcloud-vue'
```

## Manifest usage

Referenced via `widgetKey: "card-grid"`:

```json
{
  "id": "sources-cards",
  "slot": "body",
  "widgetKey": "card-grid",
  "gridWidth": 12,
  "props": {
    "objects": [
      { "id": "1", "name": "Stripe API", "status": "ok" },
      { "id": "2", "name": "HubSpot CRM", "status": "degraded" }
    ]
  }
}
```

Each item in `objects` is rendered as a `CnObjectCard`, laid out in
a responsive flex grid inside the widget's cell.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `objects` | `Array` | Object records to render as cards. |
| `title` | `String` | Widget title shown in the chrome header (default `'Items'`). |
| `documentation-url` | `String` | Documentation link for the overflow Actions menu (default `''`). |
| `widget-id` | `String` | Stable id forwarded to the widget chrome (default `''`). |

(Forwarded to `CnObjectCard` per item — see its docs for the per-card surface.)

## Events

Forwarded to each `CnObjectCard` instance — typically `@click`,
`@edit`, etc. The handler receives the card's object record.

## Spec

- REQ-MVR-010 (manifest-v2-renderer) — built-in widget: card-grid
