## 1. Page-level workspace context

- [x] 1.1 In `CnDashboardPage` `setup()`, create `const workspaceContext = ref({})` and `provide('cnWorkspaceContext', workspaceContext)` (always provided, like `cnDashboardDateRange`); return it
- [x] 1.2 Confirm the bag is inert for dashboards that don't use it (no behaviour change to existing pages)

## 2. `@workspace.*` filter tokens

- [x] 2.1 In `resolveFilterTokens.js`, resolve `@workspace.<key>` against `ctx.workspace`, treating a trailing `?` as the OPTIONAL form (stripped for lookup)
- [x] 2.2 Add `isOptionalUnresolved`, `dropOptionalUnresolved`, and `hasUnresolvedTokens` helpers
- [x] 2.3 Update the module JSDoc to document the new token + the optional/required distinction
- [x] 2.4 Cover the new behaviour in `tests/utils/resolveFilterTokens.spec.js`

## 3. CnObjectListWidget workspace binding

- [x] 3.1 Inject `cnWorkspaceContext`; build a merged `tokenCtx` (object ctx + `workspace`) and a `resolvedFilter` that resolves tokens then drops optional-unresolved keys
- [x] 3.2 Add `waitingForContext` (required token still unresolved) → render `content.prompt` and skip the fetch; key the refetch watcher on the resolved filter
- [x] 3.3 Test the prompt/skip/reveal behaviour in `tests/components/CnObjectListWidgetWorkspace.spec.js`

## 4. CnResourceSelect (create-from-search)

- [x] 4.1 Build `CnResourceSelect` — async object search over `register`+`schema`, a synthetic "Create '<term>'" option when no exact match, create-and-select via `useObjectStore`, `update:modelValue` + `create` events, `ensureSelectedLoaded` for a pre-set value
- [x] 4.2 Add `index.js`, barrel export in `src/components/index.js` + `src/index.js`, docs page + generated partial, and `tests/components/CnResourceSelect.spec.js`

## 5. interaction-form + kb-search widget kinds

- [x] 5.1 Build `CnInteractionFormWidget` — persists a contactmoment, uses `CnResourceSelect` for the client, writes `selectedClient` + `activeSummary` into the workspace context; self-registers the `interaction-form` kind in `index.js`
- [x] 5.2 Build `CnKbSearchWidget` — bound to `content.bindTo` (default `activeSummary`) with manual-override, debounced search against a configurable endpoint, graceful empty/unavailable degradation; self-registers the `kb-search` kind in `index.js`
- [x] 5.3 Import both `index.js` files in `registerDashboardWidgets.js` so the kinds resolve via `registryRenderer`
- [x] 5.4 Tests `tests/components/CnInteractionFormWidget.spec.js` + `tests/components/CnKbSearchWidget.spec.js`

## 6. Docs, baselines, validation

- [x] 6.1 Generate the docs partials for the three new components and the `CnResourceSelect` docs page; keep `check:docs` green
- [x] 6.2 Run the new + full jest suite green; lint clean on changed files
- [x] 6.3 Run `openspec validate cn-workspace-context-widgets --strict` and resolve any errors
