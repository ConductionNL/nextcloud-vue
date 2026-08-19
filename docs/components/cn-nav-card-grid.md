# CnNavCardGrid

`CnNavCardGrid` is the built-in v2 widget that renders a grid of
navigation-link cards from arbitrary manifest data. Unlike
[CnCardGrid](./cn-card-grid.md) and [CnWidgetCardGrid](./cn-widget-card-grid.md),
which both render OpenRegister object data as `CnObjectCard`, `CnNavCardGrid`
renders links — the built-in remedy for ADR-044 §4 "cards-collapse": a deep
menu group collapsed into one top-level entry (via `menu-layout.json`
relocations) plus a card-grid landing page, one card per former sub-item.

## Import

```js
import { CnNavCardGrid } from '@conduction/nextcloud-vue'
```

## Manifest usage

Referenced via `widgetKey: "nav-card-grid"`. Intended placement: a single
full-grid instance on a `type: "dashboard"` page with `config.allowEdit: false`
(reuses the dashboard page's existing GridStack dependency rather than adding
a new page type — every app in ADR-044's scope already renders a dashboard
page elsewhere, so this adds no incremental bundle weight for them):

```json
{
  "id": "progress",
  "route": "/progress",
  "type": "dashboard",
  "title": "app.progress.title",
  "config": { "allowEdit": false },
  "widgets": [
    {
      "widgetKey": "nav-card-grid",
      "slot": "body",
      "gridX": 0,
      "gridY": 0,
      "gridWidth": 12,
      "gridHeight": 6,
      "props": {
        "title": "app.progress.title",
        "entries": [
          { "id": "levels", "label": "Levels", "icon": "ChartLine", "route": "Levels", "count": "auto" },
          { "id": "responses", "label": "Responses", "route": "Responses", "count": "auto" },
          { "id": "warnings", "label": "Warnings", "description": "Flagged items needing review", "route": "Warnings" }
        ]
      }
    }
  ]
}
```

Each item in `entries` renders as a native `<router-link>` (resolvable
`route`), `<a>` (`href`, opened in a new tab), or a disabled, visibly-flagged
card (an unresolvable `route` — never silently omitted, per ADR-044 §5). No
custom keyboard handling: native elements are Tab-reachable and
Enter-activatable for free.

## The navCardEntry shape

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` (required) | Unique id within the entries array. |
| `label` | `string` (required) | Card title. |
| `description` | `string` | Optional explanatory text, wired via `aria-describedby` — never `aria-label`. |
| `icon` | `string` | MDI icon name, resolved via `CnIcon`. |
| `route` | `string` | Vue-router route name (a `pages[].id`). Mutually exclusive with `href`. |
| `href` | `string` | External URL, opened in a new tab. Mutually exclusive with `route`. |
| `count` | `integer \| "auto"` | Badge count. `"auto"` resolves from `cnMenuCounts` (see below). |
| `order` | `integer` | Display order; entries without one render last, keeping relative order. |
| `permission` | `string` | Declared for schema parity with `menuItem`; **not evaluated by this component** — see Props below. |
| `visibleIf` | object | Same `visibleIfCondition` grammar as `menuItem.visibleIf`; evaluated against `cnManifest.runtime`. |

## count: "auto"

`CnNavCardGrid` performs **no data fetching**. `count: "auto"` resolves by
injecting `cnManifest` (to look up the entry's `route` page and its
`config.register`/`config.schema`) and `cnMenuCounts` (the reactive map
`CnAppRoot` populates via `_hydrateMenuCounts()`). `CnAppRoot`'s hydration
walks both `menu[]` items **and** every `nav-card-grid` widget's `entries[]`
— required because a cards-collapse relocation removes the former leaf items
from `menu` entirely, so without this second walk the badges would never
resolve.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `entries` | `Array` | `navCardEntry[]` records to render as cards. |
| `title` | `String` | Widget title shown in the chrome header (default `'Explore'`). |
| `documentation-url` | `String` | Documentation link for the overflow Actions menu (default `''`). |
| `widget-id` | `String` | Stable id forwarded to the widget chrome; also namespaces each card's `aria-describedby` target. |

`permission` filtering is declared on the schema for parity with `menuItem`
but is **not evaluated** by this component — no v2 widget has an injected
permissions list today (that gap is fleet-wide, not specific to
`CnNavCardGrid`). `visibleIf` **is** evaluated, using the same grammar and
`cnManifest.runtime` context `CnAppNav` uses for `menu[]` items.

## Accessibility

- No `aria-label` on any card — the accessible name comes from the card's
  own content (label + icon). An explicit `aria-label` would REPLACE that
  computed name rather than supplement it.
- `description`, when present, is associated via `aria-describedby`.
- An unresolvable `route` renders the card `aria-disabled="true"`, visibly
  flagged, and emits one `console.warn` per entry id — never silently hidden.
- Cards are native `<router-link>`/`<a>` elements: Tab reaches them and
  Enter activates them without any custom keyboard handler.

## Spec

- `openspec/specs/nav-card-grid-schema` — the `navCardEntry` JSON Schema shape.
- `openspec/specs/nav-card-grid` — this component's rendering contract.
