# Tasks: Manifest detail sidebar config

## Phase 1 — `CnDetailPage.sidebar` Object form

- [x] Change `CnDetailPage.sidebar` prop `type` from `Boolean` to
      `[Boolean, Object]`. Default stays `false` for back-compat.
- [x] Add a `resolvedSidebar` computed that normalises the prop
      input to a single Object shape:
  - Boolean `true` → `{ show: true, enabled: true }`
  - Boolean `false` → `{ show: false, enabled: false }`
  - Object → fields passed through, `show` defaulting to `true`
    when omitted, `enabled` defaulting to `true` when omitted.
- [x] Add a `sidebarActive` computed: `true` only when
      `resolvedSidebar.show !== false` AND
      `resolvedSidebar.enabled !== false`.
- [x] Update `syncSidebarState()` to use `sidebarActive` as the
      gate (replacing the bare `this.sidebar` check) and to read
      `register` / `schema` / `hiddenTabs` / `title` / `subtitle` /
      `tabs` from the Object form first, falling back to
      `sidebarProps` for back-compat.
- [x] Log a one-shot `console.warn` per component instance the
      first time the prop is observed in Boolean form. Message:
      `[CnDetailPage] :sidebar=Boolean is deprecated; pass an
      Object — see docs/components/cn-detail-page.md`.
- [x] When BOTH `sidebar` (Object) AND `sidebarProps` are set with
      overlapping fields, log a `console.warn` once per component
      instance naming the fields whose Object form takes
      precedence.

## Phase 2 — `CnIndexPage.sidebar.show`

- [x] Update the `sidebar` prop's JSDoc shape to include
      `show?: boolean` (defaulting to `true`).
- [x] Update the embedded sidebar's `v-if` from
      `resolvedSidebar.enabled` to
      `resolvedSidebar.enabled && resolvedSidebar.show !== false`.
- [x] Document the `show` vs `enabled` distinction in the prop's
      JSDoc: `enabled` is the existence gate (config presence),
      `show` is the visibility gate (renders or not).

## Phase 3 — `CnPageRenderer` + `CnAppRoot` page-level `sidebar.show`

- [x] In `CnPageRenderer.vue`, expose a reactive
      `pageSidebarVisible` ref. The ref reads `currentPage?.sidebar?.show`
      (default `true`) and updates whenever `currentPage` changes.
- [x] `provide` the ref under the inject key
      `cnPageSidebarVisible`.
- [x] Apply a CSS class `cn-page-renderer--no-sidebar` on the
      renderer's wrapper element when `pageSidebarVisible` is
      `false` so consumer style-driven layouts can react.
- [x] In `CnAppRoot.vue`, `inject: { cnPageSidebarVisible: { default: { value: true } } }`,
      gate the `<slot name="sidebar" />` with
      `v-if="cnPageSidebarVisible.value"`.
- [x] Verify the inject default keeps the slot rendering when no
      descendant `CnPageRenderer` provides the ref (e.g. apps that
      mount their own page components without the renderer).

## Phase 4 — Schema

- [x] Add a top-level `sidebar` property to `$defs.page.properties`
      in `src/schemas/app-manifest.schema.json` (sibling of
      `config`). Shape: `{ type: 'object', additionalProperties: true,
      properties: { show: { type: 'boolean' } } }`. The
      `additionalProperties: true` reserves room for future fields
      (e.g. `position`, `width`) without another schema bump.
- [x] Update the description of the `sidebar` property to mention
      that it works on every page type (including `type:"custom"`)
      and that `show: false` suppresses the host App's `#sidebar`
      slot via the `cnPageSidebarVisible` inject.
- [x] Append a sentence to the `pages[].config` description noting
      that `config.sidebar` may now be an Object on detail pages
      (mirroring the index shape) and that
      `config.sidebar.show: false` suppresses the embedded sidebar
      on either index or detail pages.
- [x] Do NOT bump the schema's top-level `version` field — the
      additions are non-breaking under Strategy A.

## Phase 5 — Validator

- [x] Add validation for the new top-level `pages[].sidebar` field
      in `validateManifest.js`. When set, MUST be a plain object;
      `sidebar.show` MUST be a boolean when present. Unknown
      sub-fields tolerated for forward-compat.
- [x] Extend `validateSidebarConfig` to accept `show` on
      `config.sidebar` for index pages (boolean when set).
- [x] Extend `validateSidebarConfig` to validate `config.sidebar`
      on detail pages: when set, MUST be either a Boolean (legacy)
      OR a plain object. Object form: `show`, `enabled` MUST be
      boolean when set; `register`, `schema`, `title`, `subtitle`
      MUST be strings when set; `hiddenTabs` MUST be an array of
      strings when set; `tabs` MUST be an array when set, each
      tab follows the existing `manifest-abstract-sidebar` rules.

## Phase 6 — Tests

- [x] `tests/components/CnDetailPageSidebarConfig.spec.js` (new):
  - Boolean back-compat: `sidebar: true` activates the sidebar
    state; `sidebar: false` deactivates.
  - Boolean form fires one-shot `console.warn` per component
    instance (not per render).
  - Object form: `sidebar: { register: 'r', schema: 's' }`
    activates and forwards fields.
  - Object form: `sidebar: { show: false }` deactivates even
    when `register` and `schema` are set.
  - Object form takes precedence over `sidebarProps` for
    overlapping fields, with a `console.warn` listing the
    overlapping fields.
  - `sidebar: { show: false }` clears `objectSidebarState.tabs`
    so a hidden detail page doesn't leak prior tab state.
- [x] Update `tests/components/CnIndexPageSidebar.spec.js`:
  - `sidebar: { enabled: true, show: false }` → no embedded
    sidebar rendered.
  - `sidebar: { enabled: true, show: true }` → embedded
    sidebar rendered (current behaviour, just under the new
    flag).
  - `sidebar: { enabled: true }` (show omitted) → embedded
    sidebar rendered (default).
- [x] `tests/components/CnPageRendererCustomSidebar.spec.js`
      (new):
  - `pages[].sidebar.show: false` on a `type:"custom"` page
    sets the `cn-page-renderer--no-sidebar` class on the
    wrapper.
  - The provided `cnPageSidebarVisible` ref tracks
    `pages[].sidebar.show`.
  - `pages[].sidebar.show: true` (or unset) leaves the class
    off and the ref `true`.
  - When the route changes to a different page id, the ref
    updates.
- [x] `tests/components/CnAppRoot.spec.js`: extend with
  - `cnPageSidebarVisible` inject = `false` ref → `#sidebar`
    slot NOT rendered.
  - inject default → `#sidebar` slot rendered (current
    behaviour).
- [x] Update `tests/schemas/app-manifest.schema.spec.js`:
  - Schema `$defs.page.properties.sidebar` exists and has a
    `show` boolean sub-property.
  - Validator accepts `pages[].sidebar = { show: false }` on
    every type (index, detail, custom).
  - Validator rejects `pages[].sidebar` that is not a plain
    object.
  - Validator rejects `pages[].sidebar.show` that is not a
    boolean.
  - Validator accepts the Boolean form of `config.sidebar` on
    detail pages.
  - Validator accepts an Object `config.sidebar` on detail
    pages with `show: false`.
- [x] `tests/fixtures/manifest-sidebar-show.json` (new): a
      manifest exercising `sidebar.show` on all three page types
      (index, detail, custom). Used by the renderer + validator
      tests.

## Phase 7 — Documentation

- [x] Update `docs/components/cn-detail-page.md`:
  - Change the `sidebar` prop row's type to `Boolean | Object`
    and update its description to reference the new Object
    form.
  - Add a "Sidebar config object" section showing the Object
    shape (mirrors the manifest config block).
  - Add a "Migrating from boolean" subsection explaining the
    deprecation and the one-shot `console.warn`.
- [x] Update `docs/components/cn-index-page.md`:
  - Add `show` to the sidebar prop's documented shape.
  - Add a "show vs enabled" subsection explaining the
    distinction.
- [x] Update `docs/components/cn-page-renderer.md`:
  - Add a "Per-page sidebar visibility" section documenting
    `pages[].sidebar.show` and the `cnPageSidebarVisible`
    inject.
- [x] Update `docs/components/cn-app-root.md`:
  - Note that `<slot name="sidebar" />` is now gated by the
    `cnPageSidebarVisible` inject (default true).
- [x] Update `docs/migrating-to-manifest.md`:
  - Extend the "Sidebar" section with the new Object form on
    detail pages and the per-page `sidebar.show` mechanism.
  - Add a code example for hiding the sidebar on a custom
    page.
- [x] Run `npm run check:docs`. Must pass.

## Phase 8 — Spec capture

- [x] Write `specs/manifest-detail-sidebar-config/spec.md` with
      REQ-MDSC-N Requirements:
  - Detail-page `sidebar` accepts both Boolean and Object forms.
  - Boolean form deprecation warning fires once per component
    instance.
  - Object form fields take precedence over `sidebarProps`
    on overlap.
  - `CnIndexPage.sidebar.show` defaults to true; `false`
    suppresses the embedded sidebar even when `enabled` is
    true.
  - `pages[].sidebar.show` (top-level page entry) suppresses
    the host App's `#sidebar` slot via inject; works on every
    page type including `type:"custom"`.
  - `CnAppRoot` honours the inject when rendering its
    `#sidebar` slot.
  - Schema documents the new `pages[].sidebar` field.
  - Validator enforces the new shape rules.
  - Backwards compat preserved across all surfaces.

## Phase 9 — Wrap up

- [x] Run `npm test`. All suites green.
- [x] Run `npm run check:docs`. Must pass.
- [x] Mark every checklist item above `[x]`.
- [x] Commit on `feature/manifest-detail-sidebar-config`. Do NOT
      push, do NOT open a PR.
