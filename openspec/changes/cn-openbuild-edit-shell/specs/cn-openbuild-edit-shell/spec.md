## ADDED Requirements

### Requirement: CnOpenBuildEditButton renders only when OpenBuild is available

The library SHALL provide a `CnOpenBuildEditButton` component that renders a Conduction-orange (`var(--c-orange-knvb, #F36C21)`) icon button bearing the OpenBuild glyph and MUST render nothing when its `available` (alias `canEdit`) boolean prop is falsey. The component MUST be OpenBuild-agnostic: it MUST NOT import OpenBuild app code, MUST NOT call `useAppStatus` itself, and MUST receive availability purely through the `available` prop. The glyph MUST be a library-bundled asset (`src/img/openbuild.svg`) so the button renders without the OpenBuild app being installed.

> @e2e exclude library component — covered by jest mount tests; e2e lands in a consuming app's suite

#### Scenario: Button is hidden when OpenBuild is unavailable
- **WHEN** `CnOpenBuildEditButton` is mounted with `available` set to `false`
- **THEN** it SHALL render no button into the DOM

#### Scenario: Button renders the orange OpenBuild glyph when available
- **WHEN** `CnOpenBuildEditButton` is mounted with `available` set to `true`
- **THEN** it SHALL render an icon button whose accent color resolves to `var(--c-orange-knvb, #F36C21)`
- **AND** the button SHALL display the bundled OpenBuild glyph
- **AND** the component SHALL NOT reference the OpenBuild app id anywhere except its own bundled glyph asset

### Requirement: OpenBuild availability is derived from useAppStatus without a role endpoint

The library SHALL provide a `useOpenBuildEditAvailability()` composable that returns a reactive boolean derived from `useAppStatus('openbuild').enabled`. Because `OC.appswebroots` only lists apps enabled and reachable for the current user, an `enabled` value of `true` SHALL be treated as "this user has OpenBuild access". The library SHALL NOT call a per-user role or permission endpoint to gate the button.

> @e2e exclude composable — unit-tested via jest with OC.appswebroots stub

#### Scenario: Availability true when OpenBuild is reachable for the user
- **WHEN** `OC.appswebroots` contains the `openbuild` key
- **THEN** `useOpenBuildEditAvailability()` SHALL return `true`

#### Scenario: Availability false when OpenBuild is not reachable
- **WHEN** `OC.appswebroots` does not contain the `openbuild` key and no `openbuild` capability is advertised
- **THEN** `useOpenBuildEditAvailability()` SHALL return `false`
- **AND** no role or permission HTTP request SHALL be made to determine availability

### Requirement: The button opens an action menu with edit, save, add-widget, edit-menu and edit-sidebar items

When `available`, `CnOpenBuildEditButton` SHALL open an action menu containing: an **Edit page / Save page** toggle, an **Add widget…** item, an **Edit menu…** item, and an **Edit sidebar…** item. The **Edit page / Save page** item SHALL show "Edit page" when not editing and "Save page" when editing, toggling edit mode and (on Save) persisting. The **Add widget…** item SHALL be DISABLED unless the page is currently in edit mode. The **Add widget…** item, when enabled and activated, SHALL open `CnAddWidgetModal` (provided by the sibling `cn-widget-library` change).

> @e2e exclude library component menu — covered by jest interaction tests

#### Scenario: Edit/Save toggle reflects edit state
- **WHEN** the page is not in edit mode and the user opens the menu
- **THEN** the toggle item SHALL read "Edit page"
- **AND** activating it SHALL enter edit mode and the item SHALL then read "Save page"

#### Scenario: Add widget is disabled outside edit mode
- **WHEN** the menu is open and the page is NOT in edit mode
- **THEN** the "Add widget…" item SHALL be disabled

#### Scenario: Add widget opens the widget-library modal in edit mode
- **WHEN** the page is in edit mode and the user activates "Add widget…"
- **THEN** the component SHALL open `CnAddWidgetModal`

### Requirement: useManifestEditor holds a base and a deep-cloned working copy with dirty tracking

The library SHALL provide a `useManifestEditor` composable that, on entering edit mode, deep-clones the active manifest into a `working` copy and sets an `editing` flag, leaving the `base` manifest untouched. It SHALL expose a reactive `dirty` indicator that is `true` only when `working` differs from `base`. While `editing`, the rendered manifest source SHALL be `working`; otherwise it SHALL be `base`. Mutations performed by the grid and the edit modals SHALL apply to `working` only.

> @e2e exclude composable state — unit-tested via jest

#### Scenario: Entering edit mode clones without mutating base
- **WHEN** edit mode is entered
- **THEN** a deep clone of the manifest SHALL become the `working` copy
- **AND** the `base` manifest SHALL remain unchanged
- **AND** the `editing` flag SHALL be `true`

#### Scenario: Dirty reflects working-vs-base difference
- **WHEN** a widget position in `working` is changed
- **THEN** `dirty` SHALL be `true`
- **AND** when `working` is identical to `base`, `dirty` SHALL be `false`

### Requirement: Save computes a delta via diffManifest and discards on cancel

`useManifestEditor.save()` SHALL compute `delta = diffManifest(base, working)` and surface that delta by emitting `@save(delta)` from `CnOpenBuildEditButton` and, when a `cnPersistManifestDelta` function is injected, calling it with the delta. On successful save the composable SHALL adopt `working` as the new `base`, clear `editing`, and reset `dirty`. `cancel()` SHALL discard `working` and clear `editing` without emitting. The library SHALL NOT itself own the persistence endpoint; it SHALL only emit or call the injected persist function.

> @e2e exclude save/diff flow — unit-tested via jest against shipped diffManifest

#### Scenario: Save emits the minimal delta
- **WHEN** the user has moved one widget and activates "Save page"
- **THEN** `save()` SHALL emit `@save(delta)` where `delta` equals `diffManifest(base, working)`
- **AND** `mergeManifestDelta(base, delta)` SHALL deep-equal `working`

#### Scenario: Successful save adopts working as base
- **WHEN** a save completes successfully
- **THEN** the new `base` SHALL equal the saved `working`
- **AND** `editing` SHALL be `false`
- **AND** `dirty` SHALL be `false`

#### Scenario: Cancel discards the working copy
- **WHEN** the user has edited `working` and then cancels
- **THEN** `working` SHALL be discarded
- **AND** no `@save` event SHALL be emitted
- **AND** the rendered manifest SHALL revert to `base`

### Requirement: CnEditMenuModal edits the working copy menu in an isolated modal

The library SHALL provide a `CnEditMenuModal` located in its own file under `src/modals/` (ADR-004 modal isolation) that edits the working copy's `manifest.menu[]`: adding, removing, reordering, relabelling, re-icon-ing, re-routing entries, and editing their `children[]`. All edits SHALL mutate the `working` copy only. Any `NcSelect` used in the modal SHALL carry an `inputLabel` (or `ariaLabelCombobox`) prop per ADR-004 nc-input-labels.

> @e2e exclude modal — covered by jest mount/interaction tests

#### Scenario: Relabelling a menu entry mutates only the working copy
- **WHEN** the user changes a menu entry's label in `CnEditMenuModal`
- **THEN** the corresponding `working.menu[]` entry's label SHALL change
- **AND** the `base` manifest's menu SHALL remain unchanged

#### Scenario: Modal is isolated and accessible
- **WHEN** the change ships
- **THEN** `CnEditMenuModal` SHALL exist as a single `NcModal`-based file under `src/modals/`
- **AND** every `NcSelect` within it SHALL declare an `inputLabel` or `ariaLabelCombobox` prop

### Requirement: CnEditSidebarModal edits the active page sidebar in an isolated modal

The library SHALL provide a `CnEditSidebarModal` located in its own file under `src/modals/` (ADR-004) that edits the active page's sidebar configuration (`page.config.sidebar` tabs and visibility). All edits SHALL mutate the `working` copy only. Any `NcSelect` used SHALL carry an `inputLabel` (or `ariaLabelCombobox`) prop.

> @e2e exclude modal — covered by jest mount/interaction tests

#### Scenario: Toggling a sidebar tab's visibility mutates the working copy
- **WHEN** the user hides a sidebar tab in `CnEditSidebarModal`
- **THEN** the corresponding `working` page's `config.sidebar` SHALL reflect the hidden tab
- **AND** the `base` manifest SHALL remain unchanged

#### Scenario: Sidebar modal is isolated and accessible
- **WHEN** the change ships
- **THEN** `CnEditSidebarModal` SHALL exist as a single `NcModal`-based file under `src/modals/`
- **AND** every `NcSelect` within it SHALL declare an `inputLabel` or `ariaLabelCombobox` prop

### Requirement: The edit button mounts to the right of refresh on every page type

`CnAppRoot` / `CnPageRenderer` SHALL surface `CnOpenBuildEditButton` consistently on every page type — index, detail, dashboard, and custom — positioned immediately to the RIGHT of that page's refresh control. The button's `available` prop SHALL be derived from `useOpenBuildEditAvailability()`. When availability is false the button SHALL be absent and apps that do not opt into edit mode SHALL exhibit no behaviour change.

> @e2e exclude mounting — covered by jest mount tests across page types

#### Scenario: Button appears right of refresh on each page type
- **WHEN** a manifest renders an index, detail, dashboard, or custom page and OpenBuild is available
- **THEN** `CnOpenBuildEditButton` SHALL be present immediately to the right of the page's refresh control on each of those page types

#### Scenario: No behaviour change when OpenBuild is unavailable
- **WHEN** OpenBuild is not available to the user
- **THEN** no OpenBuild edit button SHALL render
- **AND** the page SHALL render identically to its pre-change behaviour
