import GeneratedRef from './_generated/CnMarkdownWidget.md'

# CnMarkdownWidget

Prose inside a grid page. Renders `content.markdown` through the one shared `cnRenderMarkdown` path (marked, then DOMPurify), the same renderer [`CnWikiPage`](./cn-wiki-page.md) uses, so the output is equivalent and a script tag, an event handler or a `javascript:` URL does not survive. Registered under the `markdown` type and configured by [`CnMarkdownWidgetForm`](./cn-markdown-widget-form.md).

It is the first catalog widget registered `public: true`, so a public host (the portal) may mount it; see [the public flag](./dashboard-widget-catalog.md#the-public-flag).

```json
{ "widgetKey": "markdown", "slot": "body", "gridX": 0, "gridY": 0, "gridWidth": 6, "gridHeight": 3, "props": { "content": { "markdown": "# Welcome" } } }
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The widget config: `{ markdown }`. |

<GeneratedRef />
