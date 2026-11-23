## Context

`CnIndexPage.mergedActions` (`src/components/CnIndexPage/CnIndexPage.vue` ~4084-4143) builds the row action list as `[...declared, ...this.defaultActions]`. `declared` is `config.actions`, or a named source's `rowActions` when the manifest declares none; any non-object entry is dropped with a console warning. `defaultActions` comes from `buildDefaultActions` (`defaultActions.js:21-45`), which returns View, Edit, Copy and Delete as `{ label, icon, handler }` with no id, the handlers being private closures over the page's own dialogs.

Every row surface reads `mergedActions`, so the order is already shared. Before this change the right-click menu was the one surface that skipped the per-row narrowing:

| Surface | Source before | Source after | Narrowed by `@self.actions` after |
|---|---|---|---|
| Table (`CnDataTable` `#row-actions`) | `rowActionsFor(row)` | unchanged | yes |
| List view (`CnObjectList` `#row-actions`) | `rowActionsFor(object)` | unchanged | yes |
| Card grid (`CnCardGrid` `#card-actions`) | `rowActionsFor(object)` | unchanged | yes |
| Right-click menu (`CnContextMenu`) | `mergedActions` | `rowActionsFor(contextMenuRow)` | yes |
| Keyboard primary action (`row-primary`, `runPrimaryRowAction`) | first of `rowActionsFor(row)` | first visible, enabled entry of `rowActionsFor(row)` | yes |

`CnRowActions` also hides an entry whose locally decidable `visibleWhen` is false for the row; `CnContextMenu` did not.

Built-ins are identified by their translated label everywhere: the `v-for` key and `data-testid` in `CnRowActions` and `CnContextMenu`, the `onRowAction` lookup (~5681), and `actionIdOf` in `src/utils/rowActionAvailability.js:37-45`, which falls back to the label when there is no id.

### What OpenRegister puts in `@self.actions`

- It is set only by `ObjectsController::show()`, through `withPermittedActions()` (`openregister/lib/Controller/ObjectsController.php:3126`, write at `:3193`). No list, search or index response sets it; it is the only writer of that key in `lib/`.
- Its content is `PermissionHandler::permittedActionsFor()` (`lib/Service/Object/PermissionHandler.php:1148-1168`): permission verbs, lower-case, never labels. `rowVerbs()` (`:1175-1184`) takes the catalogue verbs (`lib/Service/Rbac/PermissionCatalogue.php:110-120`) minus the schema-level `create`, `list` and `manage`, so the possible values are `read`, `update`, `delete`, `destroy`, `export`, `assign` and any custom verb an app declared.
- Checked against the local API as admin: a list request (`GET /api/objects/19/173?_limit=1`) returns rows without `@self.actions`; the same object fetched alone returns `["read","update","delete","destroy","export","assign"]`.

So on an index page fed by an OpenRegister list, `readRowAvailability` reports `known: false` and the server filter does nothing. No sibling app sets `rowActionField`. A label fallback could therefore never fire for OpenRegister-backed index pages, which is why D-6 has none. The vocabularies also differ: only `delete` coincides with a built-in id, and `copy` corresponds to the schema-level `create`, which OpenRegister deliberately leaves off rows.

## Goals / Non-Goals

**Goals:**

- Let a manifest place each built-in row action anywhere among its own row actions.
- Keep every existing manifest rendering in the same order as today. There are three deliberate exceptions: a row that carries a `@self.actions` block naming `delete` now keeps the built-in Delete (D-6), built-in testids in non-English locales become id-based (D-4), and the right-click menu drops what the row menu already dropped (D-10).
- Give built-ins stable, locale-independent ids for testids, render keys and click matching.
- Keep the right-click menu and the row actions menu the same menu: same entries, same order, same per-row narrowing.

**Non-Goals:**

- The same syntax for `bulkActions` and `headerActions` (its own change).
- Placeholders on `type: "detail"` pages.
- Translating OpenRegister permission verbs into built-in ids (delivered later by `row-action-openregister-verbs`, see D-6).
- Editing consumer apps' `check:manifest` scripts (D-5 documents the step; each app adopts it).

## Decisions

### D-1: A `builtin:*` string is a placeholder; an object is always an app action

`config.actions` accepts `"builtin:view"`, `"builtin:edit"`, `"builtin:copy"` and `"builtin:delete"`. An object is an app action whatever its `id`, and never replaces or suppresses a built-in.

The OpenCatalogi Publications page becomes:

```json
"actions": ["builtin:edit", "builtin:copy", { "id": "file-list", "label": "File list", "icon": "FormatListBulleted", "handler": "openPublicationFiles" }, "builtin:delete"]
```

Alternative rejected: letting an object with a reserved id (`"id": "edit"`) stand for or replace the built-in. About 35 index pages declare `{ "id": "view", "handler": "navigate", ... }` with `showViewAction: false`, and openconnector declares `id: "edit"` ("Open editor") beside the built-in Edit. Both would change meaning.

### D-2: One pure resolver, called from `mergedActions`

A new `src/utils/resolveRowActions.js` takes the declared entries and the enabled built-ins and returns the ordered list. It walks the declared entries in order: an object goes through the existing dispatch as an app action (any `builtin` key it carries is ignored), a placeholder emits its built-in when enabled, a repeated placeholder is skipped with a warning, and any other string is dropped with today's warning. The runtime guards matter for named-source `rowActions`, which are JavaScript and never pass through the schema. Enabled built-ins that were not placed are then appended in the default order (view, edit, copy, delete). Named-source `rowActions` go through the same function, so a source can place built-ins too.

`mergedActions` calls the resolver, and every surface reads it through `rowActionsFor(row)` (D-10), so all five share the order without further work. Keeping the resolver pure makes the ordering rules unit-testable without mounting `CnIndexPage`.

### D-3: The toggle wins

A placeholder for a built-in whose toggle is off renders nothing. This includes the named-source defaults (View and Edit off, Copy and Delete off when the source has no `copyRow` / `deleteRow`). `actionToggles` and `show*Action` remain the only way to enable or disable a built-in.

Only the validator warns about it, and only when the manifest itself turns the built-in off. The page does not warn at runtime: apps turn toggles off at runtime for legitimate reasons (`readOnly`, a permission check such as OpenCatalogi's `isAdmin`), and a warning there would be noise on correct pages.

### D-4: Built-ins carry stable ids

`buildDefaultActions` adds `id` (`view`, `edit`, `copy`, `delete`) and `builtin: true` to each built-in.

- **Testid**: a built-in renders `cn-action-item-<id>`; an app action keeps the slug of its label. English testids are unchanged; other locales stop depending on the translation.
- **Render key**: a built-in is keyed `builtin:<id>`, an app action keeps its current key. Openconnector's app action `id: "edit"` and the built-in Edit therefore never share a key.
- **Click matching**: `CnRowActions` and `CnContextMenu` add `id` to the `action` payload, plus `builtin: true` for a built-in. `onRowAction` matches on `builtin:<id>` when `builtin` is true and as today otherwise, so openconnector's app action `id: "edit"` and the built-in Edit stay distinguishable to the page and to `@action` listeners. `payload.action` stays the label, so existing listeners keep working.

The schema rejects an app action object whose `id` starts with `builtin:` or that sets a `builtin` key (D-7), so an object can never take over a built-in's key, testid or match. At runtime the resolver ignores a `builtin` key on an object for the same reason.

### D-5: Delete anywhere, with a warning

Placing `"builtin:delete"` before other entries is honoured; no separator is forced. A warning is raised when Delete is not the last entry of the effective rendered order, which includes the enabled built-ins the resolver appends: `[{ "id": "archive", ... }, "builtin:delete"]` with Edit enabled renders Archive, Delete, Edit and warns. The validator computes that order by running the same resolver over the toggles the manifest declares (with `CnPageRenderer`'s precedence: explicit `config.show*` over `actionToggles`, `readOnly` defaults). On an `entitySource` page the validator skips the warning: there CnIndexPage turns View and Edit off by default and enables Copy and Delete only when the source implements `copyRow` / `deleteRow` (`CnIndexPage.vue` ~4002-4009), which a manifest cannot show. The resolver logs the same message in development builds, where the real flags are known, so those pages are still covered at runtime.

Ajv has no warning level and `validateManifest()` returns only `errors`, so `validateManifestV2()` gains a non-fatal `warnings` array, filled by its post-schema checks. This must live in `validateManifestV2()`, not in `validateTypeConfig()`/`validateActionsArray()`: those run only for v1 manifests (`validateManifest.js` ~1017), and every fleet manifest is v2.

Apps' `check:manifest` scripts run Ajv against the raw schema, which cannot produce warnings. For the warning to show in CI an app calls `validateManifest()` from its `check:manifest` and prints `warnings` without failing on them. The library documents that step (`docs/utilities/validate-manifest.md`, `docs/migrating-to-manifest.md`); the scripts themselves change in each app's own change.

### D-6: `@self.actions` matches built-ins by id, never by label

`actionIdOf` already prefers `id`, so built-ins match by id once D-4 lands. There is no fallback to the translated label. Per the finding above, OpenRegister sends permission verbs, never labels, and never sends this block on list responses, so a label fallback could never fire for the fleet; it would only add a second, locale-dependent way to match.

Id matching alone is exact, so on a row that carries OpenRegister's block (an object fetched through `show()`) it would keep Delete and hide View, Edit and Copy. Mapping verbs to built-ins is a non-goal here; the change `row-action-openregister-verbs` ([#1328](https://github.com/ConductionNL/nextcloud-vue/issues/1328)) adds it, so a built-in also matches the verb that governs it.

### D-7: Schema and validator

Every error lives in the schema, because the schema is the one thing both paths share: apps' `check:manifest` runs Ajv2020 against it, and the library's `validateManifestV2()` runs its compiled form.

- `config.actions.items` in `app-manifest-v2.schema.json` becomes `anyOf` of the object shape and `enum: ["builtin:view", "builtin:edit", "builtin:copy", "builtin:delete"]`. The object shape gains `id: { not: { pattern: "^builtin:" } }` and `properties: { builtin: false }`, which stays valid under Ajv `strict: true`.
- `config.actions` gains one `{ contains: { const: "builtin:<name>" }, minContains: 0, maxContains: 1 }` per placeholder, which refuses a repeated placeholder without refusing two identical objects the way `uniqueItems` would.
- The page-level `allOf` gains a branch in the style of the existing `splitView` one: when `type` is not `index`, `config.actions.items` must be objects. `config.actions` is shared with detail pages, so the refusal cannot rely on the index-only placeholder rule.
- The description replaces "never by naming them here" with the placeholder rule. The schema `version` is bumped and `validateManifestV2.compiled.js` regenerated.
- `validateManifestV2()`'s post-schema checks add only the Delete warning from D-5.

### D-8: What placement changes for users

`CnRowActions` passes no `inline` to `NcActions` and sets `forceMenu` above three visible actions; `NcActions` 9.9 renders an entry inline only when it is the sole action. Placement therefore does not change which icons sit inline today. It does change the menu order and the keyboard primary action, which runs the first resolved action the menu shows and enables (hidden and disabled entries are skipped, so the keyboard never runs what the menu hides or greys out): in the Publications example the primary action becomes Edit instead of File list. The component docs state both, and that a future `inline` setting would show the first entries as icons.

### D-9: Version skew

The schema enum ships in a minor release. An app MUST raise its `@conduction/nextcloud-vue` range to that release in the same change that adds its first placeholder. That range is the only guard: the library's committed `package.json` version is a placeholder and cannot be checked at runtime.

- An app's `check:manifest` validates against the installed schema first (opencatalogi and dossiq fall back to a vendored copy only without `node_modules`), so an older library rejects the placeholder strings at build time.
- An older library that still runs the manifest does not degrade gracefully. On the fetch-and-merge path, `useAppManifest` validates the resolved manifest and, when validation fails, keeps the unresolved bundled manifest (`useAppManifest.js` ~272-282). The app then loses its backend manifest merge and its `@appconfig` sentinel resolution on every page, not just the action order. On the in-memory path the manifest mounts unchanged, and `mergedActions` drops the strings and appends the built-ins in today's order.
- No migration is needed: the syntax is opt-in and `actionToggles` keeps its meaning.

### D-10: The right-click menu is the row menu

The right-click menu and the row actions menu are logically one menu and must never drift. `CnIndexPage` passes `rowActionsFor(contextMenuRow)` to `CnContextMenu`, the same call the table, list and card surfaces make, so the context menu gets the same resolved order and the same `@self.actions` narrowing. With no row targeted, `rowActionsFor(null)` returns the unnarrowed list, as before.

The row the context menu shows is held separately from the composable's `targetItem`. `useContextMenu().close()` nulls `targetItem` while the hide animation is still running, which would turn `rowActionsFor(row)` into the unnarrowed list and re-evaluate `visibleWhen` against null mid-animation. CnIndexPage sets its own shown row on open and never clears it on close, so the closing menu keeps its entries, and a close that lands after a new right-click cannot null the new menu's row. No teardown is tied to NcActions' `@closed`, which never fires in `@nextcloud/vue` 9.9 and fires after the hide animation in 9.11, so it would race a reopen.

The two components also filter by the same rule: a shared helper decides whether an entry is visible for an item (`visible`, plus a locally decidable `visibleWhen`), and both `CnRowActions` and `CnContextMenu` call it. `CnContextMenu` gaining the `visibleWhen` check is additive: an entry without one renders as before. Keys, testids and the `action` payload come from shared helpers too (D-4), so the two menus cannot disagree on any of them.

### Alternatives considered

- **Numeric `order` on actions.** Built-ins are not objects in the manifest, so they would need their own order keys elsewhere; gaps and ties need rules; the visible order is no longer the array order.
- **A separate order list (`actionOrder: [...]`).** Two lists that must agree, each able to name an id the other lacks. The array is already ordered.
- **Relative anchors (`"after": "edit"`).** Chains of anchors can conflict or cycle and need a resolution algorithm the author has to simulate.
- **A fixed new default order** (for example built-ins first, Delete last). Changes every existing page at once and still cannot express Edit, Copy, File list, Delete.

## Risks / Trade-offs

- [Non-English test selectors on built-ins change] → English testids are unchanged; the release notes list the new id-based testids.
- [A row's right-click menu loses entries its `@self.actions` block refuses] → Intended (D-10): it now matches the row menu, which already dropped them.
- [An author places Delete first by accident] → Validator warning plus a dev console warning.
- [Placeholders copied into a detail page's `config.actions`] → Schema error on non-index pages (D-7).
- [A named source's JavaScript `rowActions` repeat a placeholder or set `builtin` on an object, which no schema sees] → The resolver keeps the first placement, ignores the `builtin` key and warns in development.
- [An app ships placeholders without raising its library range] → Its manifest fails validation on older installs and loses backend merge and sentinel resolution (D-9). The consumer docs make the range bump a required step.
- [A row fetched via `show()` loses View, Edit and Copy] → Pre-existing behaviour (today all four vanish); documented in D-6, fixed by the verb mapping in `row-action-openregister-verbs` ([#1328](https://github.com/ConductionNL/nextcloud-vue/issues/1328)).

## Migration Plan

None required. Adoption is per page: raise the library range, replace nothing, add placeholders. Rollback is removing the placeholders.

## Resolved Questions

1. The label fallback is dropped: built-ins match `@self.actions` by id, never by label (D-6).
2. The context menu reads `rowActionsFor(contextMenuRow)` and shares the row menu's visibility rule, so the two menus always stay in sync (D-10).
3. `validateManifest()` returns `warnings`, and the docs tell apps to print them from `check:manifest` so they show in CI (D-5). The apps' scripts are not changed here.
4. Mapping OpenRegister verbs onto built-ins stays a non-goal of this change; `row-action-openregister-verbs` delivers it.
5. The out-of-date scenario "View action appears only with row-click listener" is corrected in this change: `showViewAction` defaults to true with or without a row-click listener.
