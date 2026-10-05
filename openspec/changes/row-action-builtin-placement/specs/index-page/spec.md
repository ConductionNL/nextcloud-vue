## MODIFIED Requirements

### Requirement: Built-In Row Actions

CnIndexPage SHALL auto-generate row actions (View, Edit, Copy, Delete) based on the `show*Action` props, which all default to true outside a named `entitySource` page. App actions SHALL precede built-in actions unless built-ins are placed explicitly with `builtin:*` placeholders. Row actions MUST be rendered via CnRowActions in both table and card views.

#### Scenario: Default row actions

- **GIVEN** `showViewAction=true`, `showEditAction=true`, `showCopyAction=true`, `showDeleteAction=true` (all defaults)
- **AND** `actions` contains no `builtin:*` placeholder
- **WHEN** CnIndexPage renders row actions
- **THEN** `mergedActions` MUST contain, in order: any app-provided `actions`, then View, Edit, Copy, Delete
- **AND** View icon MUST be Eye
- **AND** Edit icon MUST be Pencil
- **AND** Copy icon MUST be ContentCopy
- **AND** Delete icon MUST be TrashCanOutline with `destructive: true`

#### Scenario: View action appears by default

- **GIVEN** NO `@row-click` listener is attached
- **AND** `showViewAction` is not passed
- **WHEN** CnIndexPage computes `defaultActions`
- **THEN** the View action MUST be included
- **AND** it MUST be left out only when `showViewAction` is false, or on a named `entitySource` page that does not pass `showViewAction`

#### Scenario: Disabling individual row actions

- **GIVEN** `showEditAction=false` AND `showDeleteAction=false`
- **WHEN** CnIndexPage renders row actions
- **THEN** only the View and Copy actions MUST appear among the built-ins

#### Scenario: Custom row actions slot

- **GIVEN** the parent provides `#row-actions="{ row }"`
- **WHEN** row actions render
- **THEN** the built-in CnRowActions MUST be entirely replaced by the slot content
- **AND** this is the pattern used by OpenRegister's RegistersIndex for custom actions (Publish, Import, View API Documentation, etc.)

#### Scenario: App-provided actions array

- **GIVEN** `actions=[{ label: 'Archive', icon: ArchiveIcon, handler: (row) => archive(row) }]`
- **WHEN** CnIndexPage renders row actions
- **THEN** "Archive" MUST appear before the built-in View, Edit, Copy, Delete actions

**Cross-reference:** CnRowActions in `data-display/spec.md`

## ADDED Requirements

### Requirement: Built-in row actions can be placed among app actions

On a `type: "index"` page, `config.actions` (and a named source's `rowActions`) SHALL accept the placeholder strings `builtin:view`, `builtin:edit`, `builtin:copy` and `builtin:delete`. Each placeholder MUST put that built-in at its array position. An object entry MUST always be treated as an app action, whatever its `id`, and MUST NOT replace or suppress a built-in. Enabled built-ins that are not placed MUST be appended after all other entries in the order View, Edit, Copy, Delete. The table, list view, card grid, right-click context menu and keyboard primary action MUST all use this one resolved order. The keyboard primary action MUST run the first entry the row's menu shows and enables, skipping entries hidden by `visible` / `visibleWhen` and entries that are `disabled` for the row.

#### Scenario: Built-ins placed around an app action

- **GIVEN** an index page with all built-in toggles on except `showViewAction: false`
- **AND** `config.actions` is `["builtin:edit", "builtin:copy", { "id": "file-list", "label": "File list", "handler": "openPublicationFiles" }, "builtin:delete"]`
- **WHEN** a row's action menu renders
- **THEN** the entries MUST be, in order: Edit, Copy, File list, Delete

#### Scenario: Unplaced built-ins are appended

- **GIVEN** all built-in toggles on
- **AND** `config.actions` is `["builtin:edit", { "id": "archive", "label": "Archive" }]`
- **WHEN** a row's action menu renders
- **THEN** the entries MUST be, in order: Edit, Archive, View, Copy, Delete

#### Scenario: An object with a reserved id stays an app action

- **GIVEN** `showEditAction` is on
- **AND** `config.actions` is `[{ "id": "edit", "label": "Open editor", "handler": "openEditor" }]`
- **WHEN** a row's action menu renders
- **THEN** "Open editor" and the built-in Edit MUST both render, "Open editor" first
- **AND** choosing either MUST run only its own handler

#### Scenario: Every surface shows the same order

- **GIVEN** `config.actions` is `["builtin:edit", { "id": "file-list", "label": "File list" }]`
- **WHEN** the row menu in table, list and card view, and the right-click menu, render for the same row
- **THEN** each MUST list Edit before File list
- **AND** the keyboard primary action on that row MUST run Edit

#### Scenario: The keyboard primary action skips hidden and disabled entries

- **GIVEN** a row whose first resolved action is hidden for it by `visibleWhen`, and whose second is `disabled` for it
- **WHEN** the user runs the keyboard primary action on that row
- **THEN** the third entry MUST run
- **AND** neither the hidden nor the disabled action MUST run

#### Scenario: A named source places built-ins in its own row actions

- **GIVEN** an index page backed by a named source that implements `deleteRow` and declares `rowActions: ["builtin:delete", { "id": "open", "label": "Open", "action": "open" }]`
- **AND** the manifest declares no `config.actions`
- **WHEN** a row's action menu renders
- **THEN** the entries MUST be, in order: Delete, Open

#### Scenario: Existing fleet patterns render unchanged

- **GIVEN** a page with `showViewAction: false` and `config.actions: [{ "id": "view", "label": "View", "handler": "navigate", "route": "item-detail" }]`
- **AND** a page with `config.actions: [{ "id": "edit", "label": "Open editor", "handler": "openEditor" }]` and the built-in Edit on
- **AND** a page with `showEditAction: false`, `showCopyAction: false` and `config.actions: [{ "id": "change", "label": "Change", "handler": "openChange" }]`
- **WHEN** each page's row menu renders in English
- **THEN** each page MUST render its app actions first, then its enabled built-ins in default order, as before this change
- **AND** the built-ins' testids MUST be `cn-action-item-view`, `cn-action-item-edit`, `cn-action-item-copy` and `cn-action-item-delete`, and the app actions' testids MUST be unchanged
- **AND** entries MUST NOT share a render key

### Requirement: The toggle decides whether a placed built-in renders

A placeholder for a built-in whose toggle (`actionToggles`, `show*Action`, or a named source's default) is off SHALL render nothing. When the manifest itself turns that built-in off, `validateManifest()` MUST return a warning naming the placeholder. The page MUST NOT warn about it at runtime, because a toggle turned off at runtime (a permission check, `readOnly`) is legitimate.

#### Scenario: Placeholder for a disabled built-in

- **GIVEN** `actionToggles.showCopyAction` is `false`
- **AND** `config.actions` is `["builtin:edit", "builtin:copy"]`
- **WHEN** a row's action menu renders
- **THEN** Copy MUST NOT render
- **AND** `validateManifest()` MUST return a warning naming `builtin:copy`

#### Scenario: Placeholder for a built-in turned off at runtime

- **GIVEN** `config.actions` is `["builtin:edit", "builtin:delete"]` and the manifest leaves Delete on
- **AND** the page turns `showDeleteAction` off at runtime for a user without the permission
- **WHEN** a row's action menu renders
- **THEN** Delete MUST NOT render
- **AND** no warning about `builtin:delete` MUST be logged

### Requirement: Invalid placement strings are manifest errors

The v2 manifest schema SHALL reject any string in `config.actions` other than the four placeholders, a placeholder repeated within one array, an object whose `id` starts with `builtin:`, and an object that sets a `builtin` key. On any page type other than `index`, the schema MUST reject strings in `config.actions`. Because both apps' `check:manifest` and the library's `validateManifestV2()` validate against this schema, both MUST report these errors.

#### Scenario: Unknown placeholder

- **WHEN** an index page declares `config.actions: ["builtin:archive"]`
- **THEN** schema validation MUST fail on that entry

#### Scenario: Bare reserved string

- **WHEN** an index page declares `config.actions: ["edit"]`
- **THEN** schema validation MUST fail on that entry

#### Scenario: Repeated placeholder

- **WHEN** an index page declares `config.actions: ["builtin:edit", "builtin:edit"]`
- **THEN** schema validation MUST fail on `config.actions`

#### Scenario: Repeated placeholder from a named source

- **GIVEN** a named source whose `rowActions` are `["builtin:delete", "builtin:delete"]`
- **WHEN** a row's action menu renders
- **THEN** Delete MUST render once
- **AND** a warning about the repeated placeholder MUST be logged in development

#### Scenario: App action claims the built-in namespace by id

- **WHEN** an index page declares `config.actions: [{ "id": "builtin:edit", "label": "Edit" }]`
- **THEN** schema validation MUST fail on that entry's `id`

#### Scenario: App action claims the built-in marker

- **WHEN** an index page declares `config.actions: [{ "id": "edit", "label": "Edit", "builtin": true }]`
- **THEN** schema validation MUST fail on that entry

#### Scenario: Placeholder on a detail page

- **WHEN** a `type: "detail"` page declares `config.actions: ["builtin:edit"]`
- **THEN** schema validation MUST fail on that entry

### Requirement: Delete placed before other actions produces a warning

`validateManifest()` SHALL return a `warnings` array beside `errors` for v2 manifests, filled by `validateManifestV2()`'s post-schema checks, so an app's `check:manifest` can print them in CI without failing on them. When the built-in Delete is enabled and is not the last entry of an index page's effective row action order (the declared entries followed by the enabled built-ins that are not placed), it MUST add a warning and MUST NOT add an error, and the placement MUST be honoured at runtime. On a page with `config.entitySource`, whose built-in defaults depend on the source at runtime, the validator MUST NOT add this warning; the runtime development warning still applies.

#### Scenario: Delete placed first

- **GIVEN** a v2 manifest
- **WHEN** an index page declares `config.actions: ["builtin:delete", "builtin:edit"]`
- **THEN** `validateManifest()` MUST return `valid: true` with one warning about `builtin:delete`
- **AND** the row menu MUST list Delete before Edit

#### Scenario: Delete last in the array but followed by appended built-ins

- **GIVEN** a v2 manifest with the built-in Edit enabled
- **WHEN** an index page declares `config.actions: [{ "id": "archive", "label": "Archive" }, "builtin:delete"]`
- **THEN** the row menu MUST list Archive, Delete, then the appended built-ins including Edit
- **AND** `validateManifest()` MUST return one warning about `builtin:delete`

#### Scenario: Delete appended by default

- **GIVEN** a v2 manifest
- **WHEN** an index page declares `config.actions: ["builtin:edit", { "id": "archive", "label": "Archive" }]`
- **THEN** `validateManifest()` MUST return no warning about Delete

#### Scenario: Entity-source page is not checked by the validator

- **GIVEN** a v2 manifest
- **WHEN** an index page with `config.entitySource` declares `config.actions: ["builtin:delete", { "id": "open", "label": "Open" }]`
- **THEN** `validateManifest()` MUST return no warning about Delete
- **AND** if the source implements `deleteRow`, a development warning about `builtin:delete` MUST be logged when the page renders

### Requirement: Built-in row actions carry stable ids

Built-in row actions SHALL carry the ids `view`, `edit`, `copy` and `delete`. Their `data-testid` MUST be `cn-action-item-<id>` in every locale, and their render key and click matching MUST use the id rather than the label. The `action` event payload MUST keep `action` as the label, MUST add the action's `id`, and MUST add `builtin: true` for a built-in only, so a built-in and an app action sharing an id stay distinguishable. When matching built-ins against the row availability block (`rowActionField`, default `@self.actions`), only the id MUST be used; a block entry that equals a built-in's translated label MUST NOT match it.

#### Scenario: Testid in a non-English locale

- **GIVEN** the user's language is Dutch, so the built-in Edit is labelled "Bewerken"
- **WHEN** a row's action menu renders
- **THEN** the Edit entry MUST have `data-testid="cn-action-item-edit"`

#### Scenario: Event payload keeps the label

- **WHEN** the user chooses the built-in Edit
- **THEN** the `action` event payload MUST contain `action: "Edit"` (the label), `id: "edit"` and `builtin: true`

#### Scenario: Built-in and app action with the same id

- **GIVEN** `showEditAction` is on
- **AND** `config.actions` is `[{ "id": "edit", "label": "Open editor", "handler": "openEditor" }]`
- **WHEN** the user chooses "Open editor"
- **THEN** the payload MUST contain `id: "edit"` and MUST NOT contain `builtin: true`
- **AND** only the `openEditor` handler MUST run
- **WHEN** the user then chooses the built-in Edit
- **THEN** the payload MUST contain `id: "edit"` and `builtin: true`
- **AND** only the built-in edit dialog MUST open

#### Scenario: Availability block names built-ins by id

- **GIVEN** a row whose `@self.actions` is `["edit", "delete"]`
- **AND** all built-in toggles on
- **WHEN** a row's action menu renders
- **THEN** only Edit and Delete MUST render among the built-ins

#### Scenario: Availability block names a built-in by label

- **GIVEN** a row whose `@self.actions` is `["Edit"]`
- **AND** all built-in toggles on
- **WHEN** a row's action menu renders
- **THEN** no built-in MUST render

### Requirement: The right-click menu and the row menu stay in sync

The right-click context menu on a CnIndexPage row SHALL be the same menu as that row's actions menu. It MUST be built from the same per-row list (`rowActionsFor(row)`), so it MUST contain the same entries, in the same order, after the same `@self.actions` narrowing and the same visibility rules (`visible`, and a locally decidable `visibleWhen`). Each entry MUST carry the same render key, `data-testid` and `action` event payload in both menus.

#### Scenario: Context menu narrowed like the row menu

- **GIVEN** `config.actions` is `["builtin:edit", { "id": "file-list", "label": "File list" }, "builtin:delete"]`
- **AND** a row whose `@self.actions` is `["edit", "delete"]`
- **WHEN** the user right-clicks that row
- **THEN** the context menu MUST list Edit, Delete, exactly as that row's actions menu does
- **AND** "File list" MUST NOT appear in either menu

#### Scenario: The closing context menu keeps its entries

- **GIVEN** the user right-clicked a row whose `@self.actions` is `["edit", "delete"]`
- **WHEN** the context menu closes and its hide animation runs
- **THEN** the menu MUST keep that row as its target and keep listing Edit, Delete
- **AND** a close that lands after the user right-clicks another row MUST NOT clear the new menu's row

#### Scenario: Context menu hides what the row menu hides

- **GIVEN** an app action with `visibleWhen` that is false for a row
- **WHEN** that row's actions menu and its context menu render
- **THEN** the action MUST NOT appear in either menu
