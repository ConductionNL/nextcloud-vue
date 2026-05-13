# Manifest wiki page type

## Why

Pipelinq's kennisbank ("knowledge base") declares 5 pages that all
fall back to `type: "custom"` because the library has no built-in
page type for "render a markdown article alongside a sidebar tree
of related articles":

- `Kennisbank` → `KennisbankHomeView` (article browser + categories)
- `KennisbankNew` / `KennisbankEdit` → `ArticleEditorView` (authoring)
- `KennisbankDetail` → `ArticleDetailView` (read-only article view)
- `KennisbankCategories` → `CategoryManagerView` (category admin)

That same shape — "fetch one register object, render its
markdown body, optionally render a tree of siblings/categories
beside it" — is the canonical Conduction-app docs/help/wiki/article
surface. ADR-024 lib v2 backlog calls it out explicitly: a
manifest-declared `type: "wiki"` is the missing primitive that lets
consumer apps publish read-only knowledge-base content without
shipping a bespoke `ArticleDetailView` component each time.

ADR-024 keeps the `type` enum closed; a "wiki" page is not "detail"
(no inline action toolbar, no register tabs, no sidebarProps tab
contract) and not "files" (the body is markdown, not a directory
listing). Without a dedicated `type: "wiki"` every consumer with a
markdown-driven help/docs/article route writes a `type: "custom"`
entry that reimplements markdown rendering, breadcrumbs, and a
sidebar tree.

## What Changes

`pages[].type` gains a new value: `"wiki"`. CnPageRenderer dispatches
to a new `CnWikiPage` component that renders a manifest-declared
markdown article + an optional sidebar tree. Its `config` shape:

```jsonc
{
  "id": "KennisbankDetail",
  "route": "/kennisbank/articles/:id",
  "type": "wiki",
  "title": "Article",
  "config": {
    "register": "pipelinq",          // OpenRegister register slug
    "schema": "article",              // article schema slug
    "contentField": "body",           // property holding the markdown text (default 'body')
    "titleField": "title",            // property used for the H1 (default 'title')
    "idParam": "id",                  // $route.params key holding the article id (default 'id')
    "sidebarSchema": "category",      // optional — schema providing the tree
    "sidebarRegister": "pipelinq",    // optional — defaults to `register`
    "treeField": "children",          // optional — tree-children property (default 'children')
    "sidebarTitleField": "title"      // optional — defaults to titleField
  }
}
```

Field shapes mirror the existing register/schema lookup pattern
`type: "detail"` already uses, plus the markdown content
addressing introduced here (`contentField`, `titleField`,
`idParam`).

Body rendering is delegated to the [`marked`](https://marked.js.org)
markdown parser (a 10kb gzipped library that has zero runtime
dependencies and ships ESM). The lib already pulls `marked` as a
transitive dep through `marked-terminal`; promoting it to a direct
dep adds zero install footprint. The renderer pipes the
`contentField` value through `marked.parse(...)` and inserts the
result via `v-html`, scoped under a `.cn-wiki-page__body` class so
consumers can theme the typography. `marked` is configured with
`{ gfm: true, breaks: false }` to match GitHub-flavoured markdown
without converting line breaks into `<br>` (which would surprise
authors editing in a non-WYSIWYG textarea).

The sidebar tree is OPTIONAL. When `sidebarSchema` is set, the
component renders a `<nav class="cn-wiki-page__sidebar">` containing
a small recursive `<ul>` tree built inline from the `tree` prop —
each node renders as a button + nested `<ul>` for `children`.
A tiny in-component tree avoids pulling in another library
component for one consumer-facing page. The sidebar mounts inside
the page body itself (NOT in CnAppRoot's `#sidebar` slot) so wiki
pages can ship a contextual content tree without conflicting with
the app shell's left navigation.

The component does NOT fetch data itself. Following the precedent
set by CnFilesPage and CnFormPage, it reads its content from
props — `article` (object) and `tree` (array) — that the consumer
populates either directly or via a wiki-aware data-store. This
keeps the lib zero-dep on a particular OpenRegister fetch helper
while still making the manifest config the source of truth for
which fields/registers are involved.

## Problem

Without `type: "wiki"` every consumer that ships a manifest-driven
markdown content surface (in-app help pages, "what's new"
release-note views, public knowledge bases, internal RFC archives)
writes a `type: "custom"` entry that:

- Duplicates basic markdown rendering (every consumer ends up
  hand-rolling the same regex-based markdown stub or pulling in
  an ad-hoc `marked` import).
- Forces the consumer to expose a Vue file in `customComponents`
  and re-register it in `customComponents.js`.
- Bypasses the manifest validator's awareness of the page's shape —
  the schema can't tell which schema/field holds the article body,
  so i18n audits and accessibility audits walk past these routes.
- Re-invents the sidebar-tree pattern on every project — Pipelinq
  has its own `KennisbankHome` view that does it, OpenCatalogi has
  its own glossary tree, mydash has its own "Help" tree.

This change closes the "manifest-driven markdown article" gap. It
does NOT attempt to close the "wiki authoring UI" gap — the editor
+ category-manager routes are bespoke authoring UIs (rich-text
editing, category drag-drop, version history) that aren't
representable as a static manifest.

## Proposed Solution

1. New `CnWikiPage` component renders the markdown article body
   plus an optional sidebar tree. Markdown is parsed via `marked`
   (GitHub-flavoured, no auto-`<br>` on linebreaks). Sidebar uses
   the existing `CnTreeNav` component so styling/theming carries
   over from the app shell. Errors surface in a
   `<p class="cn-wiki-page__error">` block; missing-article surfaces
   as an `NcEmptyContent` with a "back" action.
2. `CnPageRenderer`'s `defaultPageTypes` map gains a `wiki: ...`
   entry. Schema description on `pages[].type` enumerates the new
   value.
3. `validateManifest`'s `validateTypeConfig` gains a `'wiki'`
   branch: `register` and `schema` MUST be non-empty strings;
   when `sidebarSchema` is set, `sidebarRegister || register` MUST
   resolve to a non-empty string.
4. `marked` is promoted to a direct dependency of the lib
   (`^15.0.0`). The runtime cost is one ~12kb chunk on
   `defineAsyncComponent`-loaded wiki pages — apps that don't ship
   a wiki page never load it.

## Out of scope

- Wiki authoring UI (rich-text editor, version diff, category
  drag-drop). The two pipelinq routes `KennisbankNew` /
  `KennisbankEdit` (both `ArticleEditorView`) and `KennisbankCategories`
  (`CategoryManagerView`) stay `type: "custom"` — see design.md
  "Why three routes still need bespoke UIs" for the rationale.
- Internal anchor links / table of contents auto-generation. YAGNI
  for v1; markdown's own `[#anchor]` rendering is enough; revisit
  if a real consumer needs a TOC sidebar.
- Asciidoc / reStructuredText / mdx. v1 is markdown-only;
  alternative formats are a separate change.
- Markdown extensions (footnotes, math, mermaid). The base `marked`
  config covers GFM tables/strikethrough/task-lists; consumers
  needing footnotes or mermaid wire the slot escape hatch
  (`#body`) and call their own renderer.
- Live-updates: re-fetching the article when an upstream change
  arrives. The component is stateless — refresh is the consumer's
  job (or wired via the `add-live-updates-plugin` change once
  it lands).
- Search. The page renders one article at a time; cross-article
  search is a separate concern (arguably a `type: "index"` over
  the article register).

## See also

- `nextcloud-vue/openspec/changes/manifest-page-type-extensions/specs/manifest-page-type-extensions/spec.md`
  — parent change that introduced `defaultPageTypes` extension.
- `nextcloud-vue/openspec/changes/manifest-form-page-type/specs/manifest-form-page-type/spec.md`
  — sister change that added the runtime-form page type with the
  same "additive built-in type" pattern.
- `nextcloud-vue/openspec/changes/manifest-config-refs/specs/manifest-config-refs/spec.md`
  — establishes the `register`/`schema` config-key convention used
  here.
- `pipelinq/src/manifest.json` — the immediate consumer; lines
  277-311 declare the five kennisbank routes.
- `hydra/openspec/specs/cn-vue-v2-backlog/spec.md` (ADR-024 backlog)
  — fleet-wide app-manifest convention; lists `type: "wiki"` as a
  required v2 page type.
