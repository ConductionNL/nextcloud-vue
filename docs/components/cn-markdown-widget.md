import GeneratedRef from './_generated/CnMarkdownWidget.md'

# CnMarkdownWidget

Prose inside a grid page. Renders `content.markdown` through the one shared `cnRenderMarkdown` path (marked, then DOMPurify), the same renderer [`CnWikiPage`](./cn-wiki-page.md) uses, so the output is equivalent and a script tag, an event handler or a `javascript:` URL does not survive. Registered under the `markdown` type and configured by [`CnMarkdownWidgetForm`](./cn-markdown-widget-form.md).

It is the first catalog widget registered `public: true`, so a public host (the portal) may mount it; see [the public flag](./dashboard-widget-catalog.md#the-public-flag).

```json
{ "widgetKey": "markdown", "slot": "body", "gridX": 0, "gridY": 0, "gridWidth": 6, "gridHeight": 3, "props": { "content": { "markdown": "# Welcome" } } }
```

## A field of the record

On a detail page the widget can show a field of the record instead of fixed text, so an article reads as its reader sees it:

```json
{ "id": "article-body", "type": "markdown", "title": "Text", "content": { "field": "body" } }
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The widget config: `{ markdown }`, or `{ field }` to render a field of the detail page's record (a dot path, such as an article's `body`). |
| `objectData` | `object` | `null` | The detail page's record that `field` reads; the detail page hands it over. Without it the injected detail context's object is read. |

<GeneratedRef />
