# CnWidgetMapViewer

`CnWidgetMapViewer` is the built-in v2 widget that exposes the
[CnMapWidget](./cn-map-widget.md) map primitive to the manifest layer.

Note: this widget wraps `CnMapWidget` (the primitive) — **not**
`CnMapPage`. The page shell (header, filters, list pane) isn't
appropriate inside a widget slot, so the manifest layer dispatches the
naked map primitive directly.

## Import

```js
import { CnWidgetMapViewer } from '@conduction/nextcloud-vue'
```

## Manifest usage

Referenced via `widgetKey: "map-viewer"`:

```json
{
  "id": "sources-map",
  "slot": "body",
  "widgetKey": "map-viewer",
  "gridWidth": 8,
  "gridHeight": 6,
  "props": {
    "markers": [
      { "id": "1", "lat": 52.37, "lng": 4.89, "label": "NL endpoint" }
    ],
    "zoom": 8
  }
}
```

`gridHeight` matters here — maps need a defined height to render the
Leaflet canvas; the default 12-column grid row height typically
needs 4–8 rows for a usable map.

## Props

Forwarded to `CnMapWidget`. The commonly used ones:

| Prop | Type | Description |
| --- | --- | --- |
| `markers` | `Array` | Marker records `{ id, lat, lng, label?, popup? }`. |
| `zoom` | `Number` | Initial zoom level. |
| `center` | `Object` | `{ lat, lng }` center; default `[0, 0]`. |

See [CnMapWidget](./cn-map-widget.md) for the complete surface.

## Spec

- REQ-MVR-009 (manifest-v2-renderer) — built-in widget: map-viewer
