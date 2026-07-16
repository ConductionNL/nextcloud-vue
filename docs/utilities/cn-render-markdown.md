# cnRenderMarkdown

Thin wrapper around `marked.parse(...)` configured for the manifest-driven `type: "wiki"` page surface.

Centralising the configuration here gives every wiki / docs / help-page consumer the same GitHub-flavoured markdown contract:

- `gfm: true` — tables, strikethrough, task lists, fenced code.
- `breaks: false` — single newlines stay as text; only blank-line separators introduce paragraphs.

## Signature

```js
import { cnRenderMarkdown } from '@conduction/nextcloud-vue'

cnRenderMarkdown('# Hello\n\nWorld')   // -> '<h1>Hello</h1>\n<p>World</p>\n'
cnRenderMarkdown(null)                  // -> ''
cnRenderMarkdown(undefined)             // -> ''
cnRenderMarkdown({})                    // -> ''
cnRenderMarkdown('')                    // -> ''
```

## Parameters

| Arg | Type | Default | Description |
|-----|------|---------|-------------|
| `text` | `string \| null \| undefined` | — | Markdown source. Non-string values short-circuit to the empty string. |

## Returns

`string` — the parsed HTML, or `''` for non-string / empty input.

## Why this helper

The bare `marked` API throws on `null` and is configured per-call. Centralising the configuration once at module load and adding a defensive shim against null inputs lets call sites (a Vue computed `v-html` binding) stay trivially small:

```vue
<template>
  <div v-html="cnRenderMarkdown(article.body)" />
</template>

<script>
import { cnRenderMarkdown } from '@conduction/nextcloud-vue'
export default {
  props: { article: { type: Object, required: true } },
  methods: { cnRenderMarkdown },
}
</script>
```

CnWikiPage uses this helper internally; consumers who need a one-off markdown render in a custom component can import it directly without pulling `marked` themselves.
