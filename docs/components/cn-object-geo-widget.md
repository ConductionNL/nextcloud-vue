# CnObjectGeoWidget

View and edit an OpenRegister object's geographical metadata (`@self.geo`) on a map. It renders the object's location as a marker on the [`CnMapWidget`](./cn-map-widget.md) primitive, wrapped in the [`CnWidgetWrapper`](./cn-widget-wrapper.md) chrome (Widget family — carries the shared overflow Actions menu). When `editable`, clicking the map places or moves the location marker and a footer offers **Save** / **Cancel** / **Remove location**.

Registered as the built-in `object-geo` widget key and as a detail-page Add-widget type ("Location / map"), so a `type: "detail"` page can place it via `widgetKey: "object-geo"` or a user can add it in-app from the OpenBuild edit menu.

## Storage shape

The location is stored as a **GeoJSON Point geometry** in the object's `@self.geo`:

```json
{ "type": "Point", "coordinates": [5.2913, 52.1326] }
```

Note GeoJSON coordinate order is `[longitude, latitude]`. Reading is tolerant — a bare Point geometry, a `Feature`, a `FeatureCollection` (first feature is used), or a plain `{ lat, lng }` / `{ latitude, longitude }` object are all accepted.

## Persistence

**Save** issues a `PATCH /apps/openregister/api/objects/{register}/{schema}/{id}` whose body is only `{ "@self": { "geo": <point|null> } }` — the object's own properties are never touched. **Remove location** persists `@self.geo = null`. The OpenRegister save path applies `@self.geo` on both create and update; `geo` is client-writable (it drives no security or lifecycle decision).

## Usage

```vue
<!-- Standalone -->
<CnObjectGeoWidget
  :object-data="object"
  :register="register"
  :schema="schema"
  @saved="onGeoSaved" />
```

```json
// In a manifest type:"detail" page
{ "id": "location", "widgetKey": "object-geo", "title": "Location" }
```

On a `CnDetailPage`, the widget resolves the page's loaded object automatically (register / schema / object-id / object-data are supplied by the page context); the manifest entry needs no `props`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `String` | `'Location'` | Widget title shown in the header |
| `object-data` | `Object` | `{}` | The object data. Its `@self.geo` seeds the marker; `@self` also supplies `register` / `schema` / `id` fallbacks. May be `null` while the object loads (guarded) |
| `object-id` | `String\|Number` | `''` | The object's id. Explicit prop wins over `object-data['@self'].id` |
| `register` | `String\|Number` | `''` | OpenRegister register slug/id. When omitted, derived from `object-data['@self'].register` |
| `schema` | `String\|Number` | `''` | OpenRegister schema slug/id. When omitted, derived from `object-data['@self'].schema` |
| `editable` | `Boolean` | `true` | Whether the map is editable (click to set, footer Save / Remove). Read-only when `false` |
| `height` | `String\|Number` | `'360px'` | Map container height (forwarded to `CnMapWidget`) |
| `default-center` | `Array` | `[52.132633, 5.291266]` | Map centre `[lat, lng]` used when the object has no location yet (defaults to the centre of the Netherlands) |
| `default-zoom` | `Number` | `7` | Zoom used when the object has no location yet |
| `layers` | `Array` | OpenStreetMap tile layer | Base layer stack forwarded to `CnMapWidget` (`{ type, url, options }[]`). Defaults to the OpenStreetMap standard tiles; override for a different basemap (e.g. the Dutch PDOK BRT achtergrondkaart). On CSP-hardened instances the basemap's tile host must be allow-listed |
| `documentation-url` | `String` | `''` | Documentation link for the overflow Actions menu |
| `widget-id` | `String` | `''` | Stable id forwarded to the widget chrome |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `@saved` | GeoJSON Point or `null` | Emitted after `@self.geo` is persisted (placed / moved / removed) |
| `@update:geo` | GeoJSON Point or `null` | Sibling of `@saved` for `.sync`-style consumers |
