---
sidebar_position: 16
---

# CnWikiPage

A manifest-driven, read-only markdown article surface. Renders one wiki / docs / knowledge-base article — typically sourced from an OpenRegister register/schema — with an optional in-page sidebar tree of related articles or categories.

Mounted automatically by `CnPageRenderer` when a manifest page declares `type: "wiki"`. The page is read-only by design; authoring routes (article editor, category manager) stay on `type: "custom"` because they need bespoke editor chrome.

**Wraps**: `NcEmptyContent`, an internal `CnWikiTreeNode` (recursive sidebar tree), and the `cnRenderMarkdown` composable for body parsing.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `article` | `Object\|null` | `null` | The article record. When null/undefined the empty-state renders. |
| `tree` | `Array<Object>` | `[]` | The (optional) sidebar tree. Each node: `{ id, [titleField], children?: [...] }`. Empty array hides the sidebar. |
| `register` | String | `''` | OpenRegister register slug — informational at this layer; used by the manifest validator. |
| `schema` | String | `''` | OpenRegister schema slug — informational; used by the validator. |
| `contentField` | String | `'body'` | Property on `article` holding the markdown body. |
| `titleField` | String | `'title'` | Property on `article` holding the H1 title. |
| `idParam` | String | `'id'` | `$route.params` key holding the article id (informational). |
| `sidebarSchema` | String | `''` | Schema slug for the sidebar tree. When set AND `tree` is non-empty the sidebar renders. |
| `sidebarRegister` | String | `''` | Register slug for the sidebar tree (defaults to `register`). |
| `treeField` | String | `'children'` | Property on each sidebar node holding its child array. |
| `sidebarTitleField` | String | `''` | Property on each sidebar node holding its label (defaults to `titleField`). |
| `emptyText` | String | `'Article not found'` | Empty-state heading when `article` is null. |
| `emptyDescription` | String | `'The requested article could not be found.'` | Empty-state description. |
| `emptyBodyText` | String | `'No content'` | Empty-body heading when the article has no `contentField`. |
| `emptyBodyDescription` | String | `'This article has no content yet.'` | Empty-body description. |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `header` | `{ title, article }` | Replaces the default page header (`<h1>`). |
| `sidebar` | `{ tree, onClick }` | Replaces the default tree sidebar. `onClick(node)` re-emits `@tree-click`. |
| `body` | `{ article, html }` | Replaces the default markdown body. `html` is the pre-parsed markdown so a custom renderer can wrap it. |
| `empty` | — | Replaces the empty-state when `article` is null. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `tree-click` | `node` | Emitted when a sidebar tree node is clicked. The payload is the leaf node (NOT the chain of ancestors). |
| `error` | `Error` | Emitted if markdown parsing throws. Rare — `marked` is defensive — but the contract is explicit. |

## Manifest configuration

### Without sidebar

```jsonc
{
  "id": "KennisbankDetail",
  "route": "/kennisbank/articles/:id",
  "type": "wiki",
  "title": "Article",
  "config": {
    "register": "pipelinq",
    "schema": "article",
    "contentField": "body"
  }
}
```

### With sidebar tree

```jsonc
{
  "id": "DocsArticle",
  "route": "/docs/:id",
  "type": "wiki",
  "title": "Documentation",
  "config": {
    "register": "myapp",
    "schema": "doc",
    "contentField": "markdown",
    "titleField": "name",
    "sidebarSchema": "category",
    "sidebarRegister": "myapp",
    "treeField": "children",
    "sidebarTitleField": "name"
  }
}
```

## Data fetching

CnWikiPage is **stateless** — it does not fetch its own data. The consumer passes `article` and `tree` as props, typically from a register-backed store. This mirrors `CnFilesPage` and keeps the lib zero-dep on a particular OpenRegister fetcher.

A typical wrapper looks like:

```vue
<template>
  <CnWikiPage
    :article="article"
    :tree="categoryTree"
    v-bind="page.config"
    @tree-click="onCategoryClick" />
</template>

<script>
import { CnWikiPage } from '@conduction/nextcloud-vue'
import { mapState } from 'pinia'
import { useArticleStore } from '../store/article.js'

export default {
  components: { CnWikiPage },
  computed: {
    ...mapState(useArticleStore, ['article', 'categoryTree']),
    page() { return this.$store.manifest.pages.find(p => p.id === this.$route.name) },
  },
  mounted() {
    useArticleStore().fetch(this.$route.params.id)
  },
}
</script>
```

## Custom-fallback notes

- **No fetch.** As above — the component reads `article` / `tree` from props. Consumers wire their own fetch.
- **Authoring routes stay custom.** Article-edit / category-manager pages need rich-text editing, version history, and drag-drop tree manipulation; those routes belong on `type: "custom"`.
- **Markdown extensions** beyond GFM (footnotes, mermaid, math) are out of scope for v1. Use the `#body` slot to call your own renderer if needed.
- **No live updates.** Re-fetching when an upstream change arrives is the consumer's job. Once the `add-live-updates-plugin` change lands the integration becomes one line.
- **Sidebar tree is in-page, not in CnAppRoot's `#sidebar` slot.** Wiki pages render their own contextual content tree alongside the article body; the app shell's primary sidebar stays untouched.
