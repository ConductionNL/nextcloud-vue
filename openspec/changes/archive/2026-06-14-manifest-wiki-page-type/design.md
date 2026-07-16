# Design — Manifest wiki page type

## Page-type contract

`type: "wiki"` is the third "fetch-by-id, render-one-thing" page
type after `detail` (multi-tab object detail) and `chat`
(conversation transcript). It differs from `detail` along these
axes:

- **Body:** markdown text (one register property), not a tab grid.
- **No actions toolbar:** wiki pages are read-only by design;
  authoring routes stay `type: "custom"` (see "Why three routes
  still need bespoke UIs").
- **Optional sidebar:** an in-page, content-scoped tree, not the
  app-shell sidebar. CnAppRoot's `#sidebar` slot is left untouched
  so wiki pages compose with the existing left-rail navigation.
- **Single field of interest:** `contentField` (default `'body'`)
  addresses the markdown property; `titleField` (default `'title'`)
  addresses the H1.

## Why marked, not a hand-rolled renderer

The pipelinq ArticleDetailView's existing `renderedBody` computed
prop hand-rolls markdown via 5 `String.prototype.replace()` calls
that only handle `#`/`##`/`###`/`**bold**`/`*italic*` and convert
`\n` to `<br>` (which produces wrong line spacing inside lists).

Pulling in `marked` v15:

- Bundles 12kb gzipped — a one-time cost, paid only when a wiki
  page mounts (the page is `defineAsyncComponent`-wrapped).
- Handles tables, fenced code blocks, task lists, strikethrough
  out of the box — enough for any practical knowledge base.
- Has zero runtime dependencies (verified against `npm ls marked`).
- Exposes a single `parse()` function so the call site stays
  trivially testable.

`marked-terminal` already pulls `marked` into the lockfile via
docusaurus tooling; promoting it to a direct dep changes nothing
on disk.

## Sidebar tree shape

The optional sidebar exists to render *contextual* navigation —
"other articles in this category" — not the app shell's primary
navigation. The implementation renders a small recursive `<ul>`
inline (one Vue 2 functional `<TreeNode>` defined inside
CnWikiPage.vue), avoiding a new public component. The contract:

```
tree = [
  { id, title, route?, children?: tree }
]
```

The page reads its tree from a `tree` prop populated by the
consumer (typically from a register-list call against
`sidebarSchema`). The component does NOT issue the fetch itself —
keeping it stateless matches CnFilesPage / CnFormPage / CnDetailPage.

When `sidebarSchema` is unset OR `tree` is empty, the sidebar
nav is omitted entirely; the article body takes the full width.

## Why three routes still need bespoke UIs

Authoring routes need editor chrome that the manifest cannot
express:

- `KennisbankNew` / `KennisbankEdit` (`ArticleEditorView`) needs
  a rich-text editor surface (currently a textarea, but the
  long-term destination is TipTap / Toast UI), inline image
  upload, version-bump UI, and a publish-flow modal.
- `KennisbankCategories` (`CategoryManagerView`) needs drag-drop
  category reordering, parent-child tree manipulation, and a
  per-category permissions panel.

Both of these are explicitly out of scope; they remain `type:
"custom"` and the spec accepts that.

The remaining two routes — `Kennisbank` (the home/browser) and
`KennisbankDetail` — are migration candidates. This change
migrates `KennisbankDetail` (the simpler one); `Kennisbank` is
left for a follow-up because its "browse + categorise" UI is half
authoring (filter, tag-edit, category-add) and half wiki — it
fits better as a `type: "index"` extension in a later change.

## Validator boundary

`validateTypeConfig` gains a `'wiki'` branch with two checks:

1. `config.register` MUST be a non-empty string.
2. `config.schema` MUST be a non-empty string.

The optional fields (`contentField`, `titleField`, `idParam`,
`sidebarSchema`, `sidebarRegister`, `treeField`,
`sidebarTitleField`) are NOT validated for type because the shape
is documented in the schema description and the runtime defaults
take over when missing. Over-validation here would break consumer
manifests that ship custom field names (e.g.
`contentField: "markdownContent"` against a non-default schema).

## Tests

- Schema spec: `tests/schemas/app-manifest.schema.spec.js` — three
  new cases (wiki valid, wiki missing register, wiki missing
  schema).
- Component spec: `tests/components/CnWikiPage.spec.js` — markdown
  rendering, sidebar conditional, breadcrumb, title fallback,
  empty-state.
- Renderer spec: `tests/components/CnPageRenderer.spec.js` — extra
  case mounting a `type: "wiki"` page.
