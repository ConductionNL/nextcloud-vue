## ADDED Requirements

### Requirement: Shared dashboard widget registry

The library SHALL export a shared dashboard widget registry as `dashboardWidgetRegistry` plus the helpers `registerDashboardWidget(type, entry)`, `getWidgetTypeEntry(type)`, `listWidgetTypes()`, and `getDefaultContent(type)`, mapping each widget `type` string to a `{ renderer, form, defaultContent, displayName, icon, requires? }` descriptor that is the single source of truth for catalog widget types.

#### Scenario: List form-bearing types
- **WHEN** `listWidgetTypes()` is called
- **THEN** it returns only the registry keys whose entry has a non-null `form` component, so the Add-widget picker never offers a type the user cannot configure

#### Scenario: Look up a known type
- **WHEN** `getWidgetTypeEntry('label')` is called
- **THEN** it returns the `label` descriptor with its `renderer`, `form`, `defaultContent`, `displayName`, and `icon`

#### Scenario: Look up an unknown type
- **WHEN** `getWidgetTypeEntry('does-not-exist')` is called
- **THEN** it returns `null` so the caller can fall back gracefully

#### Scenario: Default content is a fresh copy
- **WHEN** `getDefaultContent('text')` is called twice
- **THEN** each call returns a fresh object copy so a caller mutating one result does not pollute the registry defaults or another caller's content

### Requirement: Consumer apps can extend and override the registry

The registry SHALL let a consuming app add a new widget type or override a built-in one via `registerDashboardWidget(type, entry)`, and a registration on an existing key SHALL overwrite the prior entry (last-registration-wins) while emitting a development warning that names the overwritten type.

#### Scenario: App registers a new type
- **WHEN** an app calls `registerDashboardWidget('my-app-chart', { renderer, form, defaultContent, displayName, icon })`
- **THEN** `getWidgetTypeEntry('my-app-chart')` returns that entry and `listWidgetTypes()` includes it (because it has a form)

#### Scenario: App overrides a built-in type
- **WHEN** an app calls `registerDashboardWidget('label', customEntry)` where `label` already exists
- **THEN** the registry stores `customEntry`, subsequent lookups return it, and a `console.warn` naming `label` is emitted to flag the override

### Requirement: CnAddWidgetModal hosts the type picker and per-type sub-form

The library SHALL provide `CnAddWidgetModal` as an isolated modal under `src/modals/` that renders a type `<select>` (filtered to `listWidgetTypes()`), mounts the active type's sub-form via `<component :is>`, and emits `submit({ type, content })` for the parent to persist, performing NO API and NO grid operations itself.

#### Scenario: Create mode shows the type picker
- **WHEN** `CnAddWidgetModal` opens with no `editingWidget` and no `preselectedType`
- **THEN** the type `<select>` is shown listing only form-bearing types and the first available type's sub-form is mounted

#### Scenario: Submit emits the assembled payload
- **WHEN** the active sub-form is valid and the user clicks the submit button
- **THEN** the modal emits `submit` with `{ type, content }` assembled from the active sub-form, and makes no API or grid call

#### Scenario: Cancel and Esc are non-destructive
- **WHEN** the user clicks Cancel, clicks the backdrop, or presses Esc
- **THEN** the modal emits `close` and never emits `submit`

### Requirement: CnAddWidgetModal preserves the validate and disabled-submit lifecycle

The modal SHALL keep the submit button disabled while the active sub-form's `validate()` returns errors, surface the first non-sentinel error as the button title, and re-evaluate validity on every sub-form `update:content` event.

#### Scenario: Submit disabled while invalid
- **WHEN** the active sub-form's `validate()` returns a non-empty error array
- **THEN** the submit button is disabled and its title shows the first error (the internal `__no-active-form__` sentinel is hidden from the user)

#### Scenario: Submit enables when valid
- **WHEN** the user edits the sub-form until `validate()` returns an empty array
- **THEN** the submit button becomes enabled on the next input event

### Requirement: CnAddWidgetModal preselected-type and edit-mode lifecycle

The modal SHALL hide the type `<select>` when a `preselectedType` is supplied or when an `editingWidget` is supplied, open directly on that type, pre-fill the sub-form from `editingWidget.content` in edit mode, and flip its title and submit label between Add and Save/Edit accordingly.

#### Scenario: Preselected type hides the picker
- **WHEN** the modal opens with `preselectedType: 'tile'`
- **THEN** the type `<select>` is hidden and the `tile` sub-form is mounted directly

#### Scenario: Edit mode pre-fills and relabels
- **WHEN** the modal opens with an `editingWidget` of type `header`
- **THEN** the type `<select>` is hidden, the `header` sub-form is pre-filled by merging `editingWidget.content` over the registry defaults, the title reads "Edit Widget", and the submit label reads "Save"

#### Scenario: Switching type resets the sub-form
- **WHEN** the user changes the type `<select>` in create mode
- **THEN** the sub-form is torn down and remounted with the new type's default content, discarding any in-progress input from the previous type

### Requirement: useWidgetForm composable manages shared form state

The library SHALL export the `useWidgetForm` composable that owns reactive `{ type, content, editingWidget }` state and exposes `resetForm(type)`, `loadEditingWidget(widget)`, `validate(subFormRef)`, and `assembleContent(subFormRef)`.

#### Scenario: resetForm seeds defaults
- **WHEN** `resetForm('label')` is called
- **THEN** state `type` becomes `label`, `content` becomes a fresh copy of the `label` default content, and `editingWidget` is cleared

#### Scenario: loadEditingWidget merges over defaults
- **WHEN** `loadEditingWidget(widget)` is called for a persisted placement missing a newer config key
- **THEN** state `content` is the registry defaults merged under `widget.content`, so missing keys get sensible defaults

#### Scenario: validate forwards to the active sub-form
- **WHEN** `validate(subFormRef)` is called and `subFormRef` has no `validate()` method
- **THEN** it returns the `['__no-active-form__']` sentinel so the modal stays in a safe disabled state during transient sub-form swaps

#### Scenario: assembleContent prefers the sub-form getter
- **WHEN** `assembleContent(subFormRef)` is called and the sub-form exposes an `assembledContent` getter
- **THEN** it returns `{ type, content }` built from that getter, otherwise it falls back to the composable's own `state.content`

### Requirement: Widget sub-editors move to the library

The library SHALL export the `CnMenuItemEditor`, `CnTextTableEditor`, and `CnNcWidgetGridPicker` sub-editor components used by the menu, text, and nc-widget forms respectively, with their input/output contracts preserved.

#### Scenario: Menu form uses the menu item editor
- **WHEN** `CnMenuWidgetForm` edits a menu's items
- **THEN** it composes `CnMenuItemEditor` and the resulting `items[]` shape is unchanged from the LaunchPad original

#### Scenario: Text form uses the table editor
- **WHEN** a `text` widget is switched to table mode
- **THEN** `CnTextTableEditor` produces the same `tableData` shape the renderer reads

### Requirement: Portable content widgets move with config schemas intact

The library SHALL move the thirteen app-coupling-free content widgets — label, text, image, link, divider, header, quicklinks, video, news, container, tile, menu, and links — to `Cn<Name>Widget` renderers and `Cn<Name>WidgetForm` forms, registered in the shared registry with their original `type` keys and `defaultContent` shapes unchanged, usable in any app with no app dependency.

#### Scenario: Label widget renders and is configurable anywhere
- **WHEN** any consuming app renders a `label` placement and opens it in `CnAddWidgetModal`
- **THEN** `CnLabelWidget` renders the text with `{ text, fontSize, color, backgroundColor, fontWeight, textAlign }` and `CnLabelWidgetForm` edits exactly that shape

#### Scenario: Text widget defaults to markdown and keeps legacy HTML
- **WHEN** a new `text` placement is created and a legacy placement without `contentMode` is rendered
- **THEN** the new one defaults to `contentMode: 'markdown'` (with optional `tableMode`/`tableData`) and the legacy one renders through the HTML branch, config schema unchanged

#### Scenario: Container hosts a recursive sub-grid
- **WHEN** a `container` placement holds child placements in `content.placements[]`
- **THEN** `CnContainerWidget` renders them through an inner grid, with no app-specific dependency

#### Scenario: Tile widget reads new and legacy shapes
- **WHEN** a `tile` placement created via the inline `content.{...}` shape and one carrying legacy flat `tile*` columns are both rendered
- **THEN** `CnTileWidget` renders both without a migration step

#### Scenario: Remaining portable widgets register unchanged
- **WHEN** image, link, divider, header, quicklinks, video, news, menu, and links placements are rendered and edited in any app
- **THEN** each resolves to its `Cn<Name>Widget` / `Cn<Name>WidgetForm` pair with its original `defaultContent` shape and no app coupling

### Requirement: NC-integration-coupled widgets degrade gracefully

The library SHALL move the four Nextcloud-app-coupled widgets — files (Files), people (Contacts), calendar (NC Calendar), and nc-widget (NC Dashboard API bridge) — documenting the required Nextcloud app for each, loading Nextcloud helpers via the peer-dependency `@nextcloud/*` modules only, and rendering an empty or disabled state (never a hard error) when the backing app or endpoint is absent.

#### Scenario: Files widget without Files data
- **WHEN** `CnFilesWidget` is configured but the Files endpoint returns no result or is unavailable
- **THEN** it renders an empty/disabled state and does not throw

#### Scenario: People widget documents Contacts dependency
- **WHEN** `CnPeopleWidget` is used
- **THEN** its docs name the Contacts/provisioning source it reads and it degrades to an empty state when that source is unavailable

#### Scenario: Calendar widget documents Calendar dependency
- **WHEN** `CnCalendarWidget` is used with internal calendars and external ICS URLs
- **THEN** its docs name the NC Calendar dependency and it shows an empty agenda when no events or no calendar backend are present

#### Scenario: nc-widget bridge stays app-agnostic
- **WHEN** `CnNcWidgetWidget` mounts a Nextcloud Dashboard widget
- **THEN** it reads the Nextcloud `OCA.Dashboard` global for the native path and the Nextcloud dashboard OCS endpoint for the API path, imports NO LaunchPad service, and degrades to an empty state when neither is available

### Requirement: Spend-analytics widget is data-source-decoupled

The library SHALL move the `spend-analytics` widget such that its component imports NO sibling app (financeq/procest); its data source MUST be supplied by the consumer via a `dataSource` prop or a `provide`d injection key exposing `fetchSummary` / `fetchVendorCommitments` / `fetchNarrative`, and the `requires.graphql` declaration MUST remain a soft metadata hint that is never promoted to `manifest.dependencies`.

#### Scenario: No library import of sibling apps
- **WHEN** the `CnSpendAnalyticsWidget` source file is inspected
- **THEN** it contains no `import` of a financeq, procest, or launchpad module path and obtains all data through the injected/prop data source

#### Scenario: Renders with an injected data source
- **WHEN** a consuming app provides a `dataSource` (or injection) exposing the three fetch functions
- **THEN** `CnSpendAnalyticsWidget` renders summary and vendor views from that source

#### Scenario: Degrades when a source is absent
- **WHEN** no spend-analytics data source is provided or a source returns no data
- **THEN** the widget shows its empty-state messages (financeq / procest not installed) instead of throwing, and `requires.graphql` never appears in `manifest.dependencies`

### Requirement: Widget style editor and visibility rules move as isolated modals

The library SHALL move the widget style editor and the widget visibility-rules surface to `CnWidgetStyleEditorModal` and `CnWidgetVisibilityRulesModal`, each in its own file under `src/modals/`, reusing the existing `CnWidgetWrapper` for widget header/title/actions chrome rather than introducing a duplicate wrapper component.

#### Scenario: Style editor is an isolated modal
- **WHEN** a consumer opens the widget style editor
- **THEN** `CnWidgetStyleEditorModal` renders as its own `src/modals/` file and emits its style result without inlined-modal markup in a parent

#### Scenario: Visibility rules modal is isolated
- **WHEN** a consumer opens the visibility-rules surface
- **THEN** `CnWidgetVisibilityRulesModal` renders include/exclude rules (group, time-of-day, date-range, user-attribute) as its own `src/modals/` file

#### Scenario: Chrome reuses CnWidgetWrapper
- **WHEN** a catalog widget renders with header and actions in a consuming context
- **THEN** it uses the library's existing `CnWidgetWrapper` for that chrome and no duplicate wrapper component is added

### Requirement: LaunchPad/MyDash behaviour is preserved as a consumer

The change SHALL preserve LaunchPad's observable behaviour by having LaunchPad import the registry, `CnAddWidgetModal`, the widgets, the composable, and the modals from `@conduction/nextcloud-vue` instead of its local copies, supplying its spend-analytics data source via injection, with no breaking change to any existing library widget key.

#### Scenario: LaunchPad add-widget flow unchanged
- **WHEN** LaunchPad adopts the library exports and a user opens the Add-widget flow, switches type, edits, and saves
- **THEN** the type picker, validation gate, edit-mode pre-fill, and `submit({type, content})` behave identically to the pre-move LaunchPad flow

#### Scenario: Existing placements keep rendering
- **WHEN** LaunchPad renders dashboards holding placements created before the move
- **THEN** every placement renders identically because each widget's `defaultContent` schema is unchanged

#### Scenario: No existing v2 widget key breaks
- **WHEN** an app uses any existing built-in v2 widget key (`object-table`, `form-renderer`, `map-viewer`, `card-grid`, `data`, `metadata`, `related`, `integration`)
- **THEN** that key resolves exactly as before, unaffected by the catalog move

### Requirement: New components meet library hygiene gates

The library SHALL export every new component from the `src/components/index.js` and `src/index.js` barrels, ship a docs page per public export so `check:docs` passes, carry 100% prop/event/slot JSDoc so `check:jsdoc` meets its baseline, isolate every modal under `src/modals/`, use only Nextcloud CSS variables with the `cn-` class prefix, and emit all user strings through the library's own `t()`.

#### Scenario: Barrel and docs coverage
- **WHEN** `npm run check:docs` runs after the move
- **THEN** every new `Cn*` widget, modal, sub-editor, and the registry exports resolve to a documented public export and the check passes

#### Scenario: JSDoc baseline at 100%
- **WHEN** `npm run check:jsdoc` runs against the new components
- **THEN** each new `Cn*` component scores 100% prop/event/slot coverage with no regression below baseline

#### Scenario: Theming and i18n conventions
- **WHEN** a new widget renders
- **THEN** it references only Nextcloud CSS variables (no `--nldesign-*`), uses `cn-`-prefixed classes, and renders strings via the library `t()` with English source strings as keys
