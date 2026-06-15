# manifest-wiki-page-type Specification

## Purpose

Add a built-in `wiki` page type to the app-manifest renderer: CnPageRenderer dispatches `type: "wiki"` pages to `CnWikiPage`, which renders a manifest-declared markdown article body (via the `marked`-backed `cnRenderMarkdown` helper) plus an optional in-page sidebar tree. The manifest validator enforces that wiki pages declare `register` + `schema`. This is the read-only counterpart to `manifest-form-page-type`; wiki authoring UIs stay `type: "custom"`.

@e2e exclude Covered by jest unit/component tests (CnWikiPage.spec.js, CnPageRenderer.spec.js wiki dispatch case, validateManifest.wikiStabilise.spec.js, cnRenderMarkdown.spec.js) — this is a shared Vue-library page-type + validator capability with no standalone Playwright app surface; component-mount and validator assertions belong in unit tests, not browser e2e (ADR-008 / Playwright-UI-only convention).

## Requirements
### Requirement: The schema MUST document `wiki` as an accepted `pages[].type` value

`src/schemas/app-manifest.schema.json` MUST extend the description on `pages[].type` to enumerate `wiki` alongside the existing values. The `pages[].config` description MUST also enumerate the `type: "wiki"` config keys (`register`, `schema`, `contentField`, `titleField`, `idParam`, `sidebarSchema`, `sidebarRegister`, `treeField`, `sidebarTitleField`). The schema's top-level `version` field MUST NOT bump — this is purely additive enrichment within the existing v1.x surface, mirroring the policy `manifest-form-page-type` followed.

#### Scenario: Manifest with type=wiki validates
- GIVEN a manifest declaring `pages[0].type = "wiki"` with `config.register` and `config.schema` set to non-empty strings
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: true, errors: [] }`

#### Scenario: Existing manifests still validate
- GIVEN a manifest using only previously-accepted `type` values
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: true, errors: [] }` — no new error from the description enrichment

### Requirement: `wiki` pages MUST declare `register` and `schema`

A `pages[]` entry with `type: "wiki"` MUST include both
`config.register` and `config.schema` as non-empty strings. Either
missing or empty MUST be a validator error.

#### Scenario: Wiki page with valid register+schema
- GIVEN `{type: "wiki", config: {register: "pipelinq", schema: "article"}}`
- WHEN validated
- THEN MUST be valid

#### Scenario: Wiki page missing register rejected
- GIVEN `{type: "wiki", config: {schema: "article"}}`
- WHEN validated
- THEN MUST return error `pages[N].config: wiki pages must declare register and schema`

#### Scenario: Wiki page missing schema rejected
- GIVEN `{type: "wiki", config: {register: "pipelinq"}}`
- WHEN validated
- THEN MUST return error `pages[N].config: wiki pages must declare register and schema`

### Requirement: `defaultPageTypes` MUST register `wiki` → `CnWikiPage`

`src/components/CnPageRenderer/pageTypes.js` MUST add `wiki` as a
key mapping to a `defineAsyncComponent`-wrapped `CnWikiPage`
import. The async unwrap pattern (`.then(m => m.default)`) MUST
mirror the other entries to avoid the Vue 2 frozen-namespace
mutation bug documented in that file's docblock.

#### Scenario: Renderer dispatches wiki pages to CnWikiPage
- GIVEN a manifest with `pages[0] = {id: "w", route: "/w/:id", type: "wiki", config: {register: "p", schema: "a"}}`
- AND CnPageRenderer mounted with `$route.name === "w"`
- WHEN the renderer resolves the page
- THEN it MUST mount the CnWikiPage component (not a custom-component fallback)

### Requirement: CnWikiPage MUST render the article body as parsed markdown

`CnWikiPage` MUST take an `article` prop (object). It MUST read
the property named by `contentField` (default `'body'`) from the
article and render it as parsed GitHub-flavoured markdown via the
`marked` library. The rendered HTML MUST be inserted via `v-html`
inside a `<div class="cn-wiki-page__body">` so consumers can theme
the typography.

#### Scenario: Body markdown rendered
- GIVEN `article = {body: "# Hello\n\nWorld"}`
- WHEN CnWikiPage mounts
- THEN the rendered DOM MUST contain `<h1>Hello</h1>` AND `<p>World</p>`

#### Scenario: contentField override
- GIVEN `article = {markdown: "## Heading"}` AND `contentField = "markdown"`
- WHEN CnWikiPage mounts
- THEN the rendered DOM MUST contain `<h2>Heading</h2>`

#### Scenario: Empty body shows empty-state
- GIVEN `article = {title: "Stub"}` AND no content for `contentField`
- WHEN CnWikiPage mounts
- THEN the rendered DOM MUST contain an empty-content placeholder (no `v-html` injection)

### Requirement: CnWikiPage MUST render the article title from `titleField`

`CnWikiPage` MUST render the value of the property named by
`titleField` (default `'title'`) as the page H1 inside a
`<header class="cn-wiki-page__header">`.

#### Scenario: Default title field
- GIVEN `article = {title: "Onboarding", body: "..."}`
- WHEN CnWikiPage mounts
- THEN the rendered DOM MUST contain `<h1>Onboarding</h1>` (or the equivalent CnPageHeader title)

#### Scenario: titleField override
- GIVEN `article = {name: "Welcome", body: "..."}` AND `titleField = "name"`
- WHEN CnWikiPage mounts
- THEN the rendered title MUST equal `Welcome`

### Requirement: CnWikiPage MUST render an optional sidebar tree when `tree` is non-empty

When the `tree` prop is a non-empty array AND `sidebarSchema` is declared in the manifest config, `CnWikiPage` MUST render a
`<nav class="cn-wiki-page__sidebar">` containing a tree component
that mounts each tree node. Empty-tree or missing-`sidebarSchema`
MUST omit the sidebar entirely.

#### Scenario: Tree present renders sidebar
- GIVEN `sidebarSchema = "category"` AND `tree = [{id: "1", title: "Onboarding"}]`
- WHEN CnWikiPage mounts
- THEN the rendered DOM MUST contain a `nav.cn-wiki-page__sidebar` element with the title "Onboarding"

#### Scenario: Empty tree omits sidebar
- GIVEN `sidebarSchema = "category"` AND `tree = []`
- WHEN CnWikiPage mounts
- THEN the rendered DOM MUST NOT contain a `nav.cn-wiki-page__sidebar` element

#### Scenario: No sidebarSchema omits sidebar
- GIVEN `tree = [{id: "1", title: "Anything"}]` AND no `sidebarSchema`
- WHEN CnWikiPage mounts
- THEN the rendered DOM MUST NOT contain a `nav.cn-wiki-page__sidebar` element

### Requirement: CnWikiPage MUST emit lifecycle events

`CnWikiPage` MUST emit:

- `@tree-click` with the clicked node `{ id, title, route?, ... }`
  whenever the user clicks a tree entry in the sidebar.
- `@error` with the error object when markdown parsing throws
  (rare — `marked` is defensive — but the contract is explicit).

#### Scenario: Tree click emits event
- GIVEN a sidebar tree with one node `{id: "x", title: "X"}`
- WHEN the user clicks the node
- THEN the component MUST emit `@tree-click` with the node object

### Requirement: CnWikiPage MUST expose header / sidebar / body slots

`CnWikiPage` MUST expose:

- `#header` — overrides the default page header. Scope:
  `{ title, article }`.
- `#sidebar` — overrides the default sidebar tree. Scope:
  `{ tree, onClick }`.
- `#body` — overrides the default markdown body. Scope:
  `{ article, html }` where `html` is the pre-parsed markdown.
- `#empty` — replaces the empty-state when `article` is null.

#### Scenario: #body slot overrides default rendering
- GIVEN `article = {body: "# Test"}` AND a `#body` scoped slot is supplied
- WHEN CnWikiPage mounts
- THEN the slot MUST render in place of the default `cn-wiki-page__body` div
- AND the default `cn-wiki-page__body` MUST NOT be in the DOM

