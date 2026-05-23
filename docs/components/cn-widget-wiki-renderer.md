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
| `register` | `String` | Register slug to fetch wiki articles from (self-fetch mode). |
| `schema` | `String` | Schema slug for the article objects. |
| `contentField` | `String` | Property name on the article object containing the markdown body. Defaults to `content`. |
| `titleField` | `String` | Property name on the article object containing the title. Defaults to `title`. |
| `idParam` | `String` | Route param name used to deep-link a specific article. Defaults to `id`. |
| `sidebarSchema` | `String` | Schema slug for the sidebar tree's object kind (when different from the body schema). |
| `sidebarRegister` | `String` | Register slug for the sidebar tree (when different from the body register). |

See the [CnWikiPage docs](./cn-wiki-page.md) for the complete surface
(layout slots, edit mode, search hooks, etc.).

## Events

All listeners are forwarded to `CnWikiPage`.

## Spec

- REQ-MVR-008 (manifest-v2-renderer) — built-in widget: wiki-renderer
