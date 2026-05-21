# CnWidgetWikiRenderer

`CnWidgetWikiRenderer` is the built-in v2 widget that exposes
[CnWikiPage](./cn-wiki-page.md) to the manifest layer. It's a
transparent pass-through — all wiki-relevant props are forwarded.

## Import

```js
import { CnWidgetWikiRenderer } from '@conduction/nextcloud-vue'
```

## Manifest usage

Referenced via `widgetKey: "wiki-renderer"`:

```json
{
  "id": "docs-wiki",
  "slot": "body",
  "widgetKey": "wiki-renderer",
  "gridWidth": 12,
  "props": {
    "article": { "id": "intro", "title": "Introduction", "body": "..." },
    "tree": [{ "id": "intro", "label": "Introduction" }]
  }
}
```

## Props

Forwarded verbatim to `CnWikiPage`:

| Prop | Type | Description |
| --- | --- | --- |
| `article` | `Object` | The article record to render. |
| `tree` | `Array` | Sidebar tree of articles. |

See the [CnWikiPage docs](./cn-wiki-page.md) for the complete surface
(layout slots, edit mode, search hooks, etc.).

## Events

All listeners are forwarded to `CnWikiPage`.

## Spec

- REQ-MVR-008 (manifest-v2-renderer) — built-in widget: wiki-renderer
