## Why

A manifest `type: "index"` page can turn the built-in row actions (View, Edit, Copy, Delete) on and off, but it cannot say where they go: app actions always come first and the built-ins are always appended. OpenCatalogi's Publications page wants Edit, Copy, File list, Delete, which today needs a hand-written wrapper or a re-implementation of the built-in dialogs.

## What Changes

- `config.actions` on an index page accepts four placeholder strings, `"builtin:view"`, `"builtin:edit"`, `"builtin:copy"` and `"builtin:delete"`. Each one puts that built-in at its array position, provided its toggle (`actionToggles` / `show*Action`) leaves it on.
- An object in `config.actions` is always an app action, whatever its `id`. Objects never replace or suppress a built-in, so the ~35 pages that declare their own `{ "id": "view", ... }` with `showViewAction: false`, and openconnector's `id: "edit"` "Open editor" beside the built-in Edit, keep rendering exactly as today.
- Enabled built-ins that the array does not name are appended after everything else, in the default order. A page that uses no placeholder renders unchanged.
- A placeholder for a built-in that is toggled off renders nothing: the toggle wins. The validator warns when the manifest itself turns that built-in off; the page does not warn at runtime, because a toggle turned off for permissions or `readOnly` is legitimate.
- The keyboard primary action runs the first entry the row menu shows and enables, skipping hidden and disabled entries.
- Unknown `builtin:*` strings, bare strings such as `"edit"`, a placeholder repeated in one array, and an app action object whose `id` starts with `builtin:` or that sets `builtin` are schema errors.
- Built-in actions get stable internal ids (`view`, `edit`, `copy`, `delete`). Their `data-testid`, render key and click matching use the id instead of the translated label. English testids do not change (`cn-action-item-edit` and so on); in other locales they stop depending on the translation.
- A row's availability block (`@self.actions`) matches built-ins by id only. There is no label fallback: OpenRegister sends permission verbs, never labels, and only on single-object fetches.
- The library validator reports a warning, not an error, when Delete is not the last entry of the rendered order, appended built-ins included. `validateManifest()` returns these in a `warnings` array, and the docs tell consumer apps to print them from their `check:manifest` so they show in CI.
- One resolver produces the ordered list for every row surface: table, list view, card grid, the right-click context menu and the keyboard primary action.
- The right-click context menu and the row actions menu are the same menu. The context menu reads the same per-row list as the row menu (`rowActionsFor(row)`), so it honours `@self.actions` and the same visibility rules, in the same order.

## Non-goals

- Placeholders in `bulkActions` or `headerActions`. They get the same syntax in their own change.
- Placeholders on `type: "detail"` pages, whose `config.actions` is a different dialect.
- Mapping OpenRegister's permission verbs (`read`, `update`, `delete`) onto built-in ids for `@self.actions` filtering. See design D-6.
- Changing consumer apps' `check:manifest` scripts. The library returns the warnings and documents how to print them; each app adopts that in its own change.
- Any migration of existing manifests. The syntax is opt-in and `actionToggles` stays the way to enable or disable a built-in.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `index-page`: the "Built-In Row Actions" requirement changes from "app actions SHALL appear before built-in actions" to "app actions precede built-ins unless built-ins are placed explicitly", and its out-of-date View scenario is corrected (`showViewAction` defaults to true, with or without a row-click listener). It gains requirements for the placeholder grammar, the toggle precedence, the stable built-in ids and the context menu staying in sync with the row menu.

## Impact

- **Code**: `src/components/CnIndexPage/CnIndexPage.vue` (`mergedActions`, `onRowAction`, `runPrimaryRowAction`), `src/components/CnIndexPage/defaultActions.js`, a new pure resolver under `src/utils/`, `src/utils/rowActionAvailability.js` (`actionIdOf`), `src/components/CnRowActions/CnRowActions.vue` and `src/components/CnContextMenu/CnContextMenu.vue` (key, testid, payload and one shared visibility rule), `src/utils/validateManifest.js` (`validateManifestV2` post-schema checks), `src/schemas/app-manifest-v2.schema.json` and the generated `src/utils/validateManifestV2.compiled.js`.
- **Public API**: additive. The `action` event keeps `action: <label>` in its payload and gains `id`, plus `builtin: true` for a built-in. Built-in action objects gain `id` and `builtin: true`. `validateManifest()` gains a `warnings` array beside `errors` for v2 manifests. `CnContextMenu` also honours a row action's `visibleWhen`, as `CnRowActions` already does.
- **Behaviour**: on CnIndexPage the right-click menu now drops the actions a row's `@self.actions` block does not allow, as the row menu already did.
- **Consumer apps**: OpenCatalogi (Publications) is the first adopter. An app that adopts the syntax MUST raise its `@conduction/nextcloud-vue` range to the release that ships it: on an older library its manifest fails validation and `useAppManifest` falls back to the unresolved bundled manifest, losing the backend merge and sentinel resolution. OpenConnector, Dossiq, Pipelinq, OpenRegister and Launchpad are unaffected unless they opt in. Tests that select a built-in by a non-English testid must switch to the id-based testid.
- **Theming**: none. No CSS changes.
