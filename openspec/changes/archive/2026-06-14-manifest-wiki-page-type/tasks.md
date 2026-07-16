# Tasks: Manifest wiki page type

## Phase 1 — Schema + validator

- [x] Update `src/schemas/app-manifest.schema.json`:
      - Extend the `pages[].type` description to enumerate `wiki`
        alongside the existing types.
      - Extend the `pages[].config` description to spell out the
        `type: "wiki"` shape (`register`, `schema`, `contentField`,
        `titleField`, `idParam`, `sidebarSchema`, `sidebarRegister`,
        `treeField`, `sidebarTitleField`).
      - Do NOT bump the schema's top-level `version` — same
        additive-description policy as `manifest-form-page-type`.
- [x] Update `src/utils/validateManifest.js`'s `validateTypeConfig`:
      add a `'wiki'` branch. Required: `register` and `schema`
      MUST be non-empty strings.
- [x] Add ≥3 new test cases to
      `tests/schemas/app-manifest.schema.spec.js`:
      bare-wiki-valid, missing-register-rejected, missing-schema-rejected.

## Phase 2 — Markdown helper

- [x] Add `marked` (`^15.0.0`) to `package.json` `dependencies`.
- [x] Create `src/composables/cnRenderMarkdown.js`:
      thin wrapper around `marked.parse(...)` configured with
      `{ gfm: true, breaks: false }`. Exports
      `cnRenderMarkdown(text)` returning the parsed HTML string.
      Defensive — returns `''` for null/undefined/non-string input.
- [x] Unit tests for the helper: heading / paragraph / list /
      table / code-fence / null-input cases.

## Phase 3 — CnWikiPage component

- [x] Create `src/components/CnWikiPage/CnWikiPage.vue`:
      - Renders CnPageHeader (title from `article[titleField]`)
        overridable via `#header`.
      - Renders the markdown body via the new helper into a
        `cn-wiki-page__body` div, overridable via `#body`.
      - Renders an optional `nav.cn-wiki-page__sidebar` with
        CnTreeNav when `tree` is non-empty AND `sidebarSchema`
        is set; overridable via `#sidebar`.
      - Renders `NcEmptyContent` when `article` is null;
        overridable via `#empty`.
      - Emits `@tree-click`, `@error`.
      - 100% JSDoc coverage on every prop / event / slot.
- [x] Create `src/components/CnWikiPage/index.js` barrel.
- [x] Add docblock at the top of `CnWikiPage.vue` documenting the
      contract (mirroring CnFilesPage's docblock).
- [x] Export `CnWikiPage` from `src/components/index.js`.

## Phase 4 — Renderer wiring

- [x] Update `src/components/CnPageRenderer/pageTypes.js`:
      add `wiki: defineAsyncComponent(() => import('../CnWikiPage/CnWikiPage.vue').then(m => m.default))`.

## Phase 5 — Tests

- [x] Add `tests/components/CnWikiPage.spec.js` with at least:
      - Renders `<h1>` from default `titleField`
      - Renders parsed markdown into `cn-wiki-page__body`
      - `contentField` override reads from a non-default property
      - Empty body shows empty-state placeholder
      - `tree` + `sidebarSchema` renders sidebar; empty tree omits it
      - Tree node click emits `@tree-click` with the node
      - `#body` slot overrides default rendering
      - `#header` slot overrides default header
      - `null` article shows the empty-state
- [x] Update `tests/components/CnPageRenderer.spec.js`:
      add a `type: "wiki"` entry to the sample manifest and assert
      that the renderer mounts the wiki page.

## Phase 6 — Docs

- [x] Add `docs/components/cn-wiki-page.md` covering: what it is,
      when to use it (vs detail page vs custom), prop reference,
      slot reference, both with-sidebar and without-sidebar
      examples, and a worked pipelinq `KennisbankDetail` example.
- [x] Update `docs/migrating-to-manifest.md`:
      add a "Wiki / knowledge-base rendering" subsection pointing
      at CnWikiPage; spell out which wiki-shaped routes belong on
      `type: "wiki"` and which still need `type: "custom"`
      (authoring routes).
- [x] Run `npm run check:docs` — should pass with the new
      `cn-wiki-page.md` covering the new component.

## Phase 7 — Verification

- [x] Run `npm test` — all suites pass (existing + new).
- [x] Run `npm run check:docs` — passes.
- [x] Run `npm run check:jsdoc` — passes (new component at 100%).
- [x] Run `npx eslint src/components/CnWikiPage src/composables/cnRenderMarkdown.js tests/components/CnWikiPage.spec.js` — passes.
- [x] Stage + commit the change. Do NOT add `Co-Authored-By` trailers.
