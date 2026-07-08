## ADDED Requirements

### Requirement: Multi-source icon selection

`CnIconPicker` SHALL accept a `sources` prop — an array containing any of `mdi`, `fontawesome`, `opengemeenten` — that determines which icon sets are offered. The prop SHALL default to `['mdi']`. When more than one source is enabled the component SHALL render a source-switcher; when exactly one source is enabled no switcher SHALL be shown.

#### Scenario: Default single source renders no switcher
- **WHEN** `CnIconPicker` is rendered without a `sources` prop
- **THEN** only MDI icons are offered
- **AND** no source-switcher control is rendered

#### Scenario: Multiple sources render a switcher
- **WHEN** `CnIconPicker` is rendered with `:sources="['mdi','fontawesome']"`
- **THEN** a source-switcher is rendered offering MDI and FontAwesome
- **AND** switching the source replaces the displayed icon grid with that source's catalogue

#### Scenario: Single non-default source
- **WHEN** `CnIconPicker` is rendered with `:sources="['fontawesome']"`
- **THEN** only FontAwesome icons are offered and no switcher is rendered

### Requirement: Bring-your-own catalogue with library-supplied adapters

The library SHALL NOT bundle any third-party icon pack. `CnIconPicker` SHALL accept a `catalogues` prop mapping each source name to a catalogue array in the established `{ key, label, value, search, path?, component? }` shape. The library SHALL export adapters `fromMdiJs`, `fromFontAwesome`, and `fromOpenGemeenten` that convert a raw source into that shape. The FontAwesome adapter SHALL deduplicate icons by value.

#### Scenario: Consumer supplies a catalogue
- **WHEN** a consumer passes `:catalogues="{ fontawesome: fromFontAwesome({ fas }) }"` and `:sources="['fontawesome']"`
- **THEN** the picker renders the icons produced by the adapter
- **AND** no icon pack is imported by the library itself

#### Scenario: FontAwesome adapter deduplicates
- **WHEN** `fromFontAwesome` receives packs containing duplicate icon names
- **THEN** the returned catalogue contains each icon value at most once

### Requirement: MDI default with optional-dependency fallback

When `sources` includes `mdi` and no `catalogues.mdi` is supplied, `CnIconPicker` SHALL attempt to load the full MDI range from the optional `@mdi/js` dependency. If that dependency is unavailable the component SHALL fall back to the built-in `DASHBOARD_ICONS` set and SHALL still render.

#### Scenario: MDI pack present
- **WHEN** `@mdi/js` is installed and `sources` includes `mdi` with no `catalogues.mdi`
- **THEN** the picker offers the full MDI icon range

#### Scenario: MDI pack absent
- **WHEN** `@mdi/js` cannot be imported and `sources` includes `mdi`
- **THEN** the picker offers the built-in `DASHBOARD_ICONS` set instead of throwing

### Requirement: Searchable icon grid

`CnIconPicker` SHALL accept a `searchable` prop (default `false`). When enabled, a search box SHALL filter the current source's catalogue by label and value. When no query is present the grid SHALL be capped to a bounded number of tiles for performance; when a query is present the cap SHALL be lifted. The currently selected icon SHALL always remain visible regardless of the cap.

#### Scenario: Search filters the grid
- **WHEN** `searchable` is enabled and the user types a query
- **THEN** only icons whose label or value matches the query are shown
- **AND** the display cap does not hide matches

#### Scenario: Selected icon stays visible under the cap
- **WHEN** `searchable` is enabled, no query is present, and the selected icon falls outside the capped slice
- **THEN** the selected icon is still rendered in the grid

### Requirement: Custom SVG authoring

`CnIconPicker` SHALL accept an `allowCustomSvg` prop (default `false`). When enabled, the component SHALL offer a custom mode with a CodeMirror XML editor and a "Format SVG" action that pretty-prints the SVG markup. In custom mode the emitted value SHALL be the raw SVG string.

#### Scenario: Custom SVG value is emitted
- **WHEN** `allowCustomSvg` is enabled, the user switches to custom mode and enters SVG markup
- **THEN** the component emits the raw SVG string as its value

#### Scenario: Format action pretty-prints
- **WHEN** the user clicks "Format SVG" with valid single-line SVG markup
- **THEN** the editor content is replaced with an indented, multi-line rendering of the same SVG

#### Scenario: Format action ignores invalid input
- **WHEN** the user clicks "Format SVG" with content containing no `<svg>` element
- **THEN** the editor content is left unchanged

### Requirement: Icon placement

`CnIconPicker` SHALL support an icon `placement` of `left` or `right` via `v-model:placement` (default `left`), emitting an `update:placement` event when changed.

#### Scenario: Placement round-trips
- **WHEN** a consumer binds `v-model:placement` and selects `right`
- **THEN** the component emits `update:placement` with `'right'`

### Requirement: Backward-compatible additions

All new props (`sources`, `catalogues`, `searchable`, `allowCustomSvg`, `placement`) SHALL be optional and defaulted such that an existing `<CnIconPicker v-model="icon" />` usage renders and behaves exactly as before this change. No existing prop, event, or slot SHALL be removed or repurposed.

#### Scenario: Existing usage unchanged
- **WHEN** `CnIconPicker` is used with only `v-model` and no new props
- **THEN** it renders the MDI/DASHBOARD_ICONS grid with upload/clearable behaviour identical to the prior version
