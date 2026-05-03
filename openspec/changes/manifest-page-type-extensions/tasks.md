# Tasks: Manifest page-type extensions

## Phase 1 — Schema + validator

- [ ] Update `src/schemas/app-manifest.schema.json` to extend the
      `pages[].type` enum from `["index","detail","dashboard","custom"]`
      to `["index","detail","dashboard","logs","settings","chat","files","custom"]`.
      Bump the schema's `"version"` from `1.0` to `1.1`.
- [ ] Update `src/utils/validateManifest.js` test fixtures to cover
      the new enum values + each new type's required `config` fields.
- [ ] Add per-type `config` shape validation:
  - `logs` requires one of `register` / `schema` / `source`.
  - `settings` requires `sections: array<{title, fields[]}>`.
  - `chat` requires one of `conversationSource` / `postUrl`.
  - `files` requires `folder: string`.
  Validation surfaces a clear error at the missing-field path.

## Phase 2 — Components

- [ ] Add `src/components/CnLogsPage/CnLogsPage.vue` — wraps
      `CnDataTable` with timestamp / actor / action columns, pagination,
      filtering. Reads `register` / `schema` / `source` from `config`;
      fetches via `useObjectStore` when `register+schema` is set,
      via `axios.get(source)` when only `source` is set.
- [ ] Add `src/components/CnSettingsPage/CnSettingsPage.vue` — renders
      `config.sections` via `CnSettingsCard` + `CnSettingsSection`;
      each field binds to an `IAppConfig` key via the consumer's
      settings controller. Accepts a `saveEndpoint` prop with a sensible
      default.
- [ ] Add `src/components/CnChatPage/CnChatPage.vue` — initial
      implementation: embed an `<iframe>` to NC Talk's conversation
      view via `config.conversationSource`. Future iteration: native
      thread renderer.
- [ ] Add `src/components/CnFilesPage/CnFilesPage.vue` — embed NC
      Files' file-picker view via the public `OC.dialogs.filepicker`
      API or the equivalent component. Honour `config.folder` +
      `config.allowedTypes?: string[]`.
- [ ] Each new component MUST honour `headerComponent`,
      `actionsComponent`, and the generic `slots` map from `pages[]`,
      mirroring the existing `index`/`detail`/`dashboard` types.

## Phase 3 — Renderer dispatcher

- [ ] Update `src/components/CnPageRenderer/CnPageRenderer.vue` to
      add four new dispatcher branches for `logs`, `settings`, `chat`,
      `files`, each mounting the matching component with `defineAsyncComponent`
      for tree-shaking.
- [ ] Update the `pageTypes` registry default to register the four
      new built-ins. Apps' explicit `pageTypes` prop on `CnAppRoot`
      can still override or add entries.

## Phase 4 — Spec + tests

- [ ] Write `specs/manifest-page-type-extensions/spec.md` with one
      Requirement per new type + one Requirement per `config` shape
      validation rule + one Requirement on the renderer dispatcher.
- [ ] Update `openspec/changes/add-json-manifest-renderer/specs/json-manifest-renderer/spec.md`'s
      REQ-JMR-3 to reflect the extended enum (cross-link this change
      under "Subsequent extensions").
- [ ] Add component snapshot tests for each new type: empty state,
      populated state, header/actions slot override.
- [ ] Add a Manifest fixture covering all 8 types + run validator
      against it; expect zero errors.

## Phase 5 — Documentation

- [ ] Update `docs/migrating-to-manifest.md` with examples of each new
      type and how to migrate from `type:"custom"` to a built-in
      where applicable.
- [ ] Update `docs/components/cn-logs-page.md`, `cn-settings-page.md`,
      `cn-chat-page.md`, `cn-files-page.md` (`check:docs` enforces
      these per the docs-coverage script).
- [ ] Add a "type-selection guide" section in
      `docs/migrating-to-manifest.md` — when to pick `index` vs
      `detail` vs `logs` vs `custom`; the criteria are: declarative
      data-shape (use a built-in) vs bespoke layout (use `custom`).

## Phase 6 — Cross-app coordination

- [ ] Reference this change from `hydra/openspec/architecture/adr-024-app-manifest.md`
      under "Schema evolution" — the closed enum extends safely;
      apps using v1.0 keep working.
- [ ] Update `hydra/openspec/changes/adopt-app-manifest/specs/adopt-app-manifest/spec.md`
      to note that the recommended migration order may surface more
      `type:"custom"` pages on early adopters; later apps benefit from
      the extended enum.
- [ ] Open per-app follow-up issues for migrating existing
      `type:"custom"` pages to the new built-ins where applicable.
      Initial candidates: openregister-adopt-app-manifest (17 custom
      pages — most can move), decidesk-manifest-v1 (16 custom pages
      flagged for refactor — ~12 likely move to the new types).
