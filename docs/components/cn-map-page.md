import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnMapPage.md'

# CnMapPage

Manifest-driven map page. Resolved automatically by `CnPageRenderer` for `pages[]` entries with `type: "map"` — composes `CnPageHeader` + `CnMapWidget` and forwards the manifest's `config.{center, zoom, layers, markers, height, clustering, autoFit}` shape. Spec: REQ-MMW-* (manifest-map-widget).

## Try it

<Playground component="CnMapPage" />

## Manifest example

```jsonc
{
  "id": "CaseMap",
  "route": "/map",
  "type": "map",
  "title": "procest.case_map.title",
  "config": {
    "center": [52.1326, 5.2913],
    "zoom": 7,
    "layers": [
      { "type": "tile",
        "url":  "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png",
        "options": { "attribution": "© Kadaster", "maxZoom": 19 } },
      { "type": "wms",
        "url":  "https://service.pdok.nl/lv/bag/wms/v2_0",
        "options": { "layers": "pand", "transparent": true, "opacity": 0.6 } }
    ],
    "markers": {
      "dataSource": { "url": "/index.php/apps/procest/api/cases/geo" },
      "latField":   "lat",
      "lngField":   "lng",
      "popupField": "title",
      "clustering": true
    },
    "height": "calc(100vh - 200px)"
  }
}
```

## Slots

| Slot       | Scope                          | Purpose                                                        |
|------------|--------------------------------|----------------------------------------------------------------|
| `#header`  | `{ title, description }`       | Override the default `CnPageHeader`.                           |
| `#filters` | —                              | Render filter chrome between header and map.                   |
| `#legend`  | `{ layers, markers }`          | Custom legend overlay (passes through to `CnMapWidget`).       |
| `#popup`   | `{ feature, properties }`      | Override default popup HTML (passes through to `CnMapWidget`). |

## Events

`@map-ready`, `@marker-click`, `@bounds-change`, `@click` — all forward verbatim from the underlying `CnMapWidget`. See the [CnMapWidget](./cn-map-widget) docs for payload shapes.

## Reference

<GeneratedRef />
