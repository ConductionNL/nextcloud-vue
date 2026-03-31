---
status: implemented
---

# Layout Components — Spec

## Purpose
Specifies the page layout components: CnPageHeader, CnActionsBar, CnFilterBar, CnFacetSidebar, CnMassActionBar, CnIndexSidebar.

---

## Requirements

### REQ-LC-001: CnPageHeader — Page Title Block

CnPageHeader MUST render a page title block with an icon, title, description, and an extra content slot.

#### Scenario: Header rendering

- GIVEN props `title="Clients"`, `description="Manage clients"`, `icon="AccountGroup"`
- WHEN CnPageHeader renders
- THEN it MUST show a CnIcon with the icon name
- AND the title in an appropriate heading element
- AND the description below the title
- AND an `#extra` slot for additional header content

### REQ-LC-002: CnActionsBar — Action Bar

CnActionsBar MUST provide a primary Add button, a unified actions dropdown menu, mass action controls, and an optional view mode toggle.

#### Scenario: Add button

- GIVEN CnActionsBar renders
- THEN a standalone primary NcButton MUST be shown for the Add action
- AND if `addIcon` is provided, a CnIcon with that name MUST appear as the button icon
- AND if `addIcon` is empty, a Plus icon MUST appear as fallback
- AND `addLabel` MUST set the button text (default "Add")
- AND `@add` MUST emit on click

#### Scenario: Unified actions menu

- GIVEN CnActionsBar renders
- THEN a single NcActions dropdown labeled "Actions" MUST appear
- AND Refresh MUST be the first item in the menu
- AND `@refresh` MUST emit when Refresh is clicked
- AND a `#action-items` slot MUST allow custom action items after Refresh
- AND a separator MUST appear between primary and mass actions (when `selectable=true`)

#### Scenario: Mass actions

- GIVEN the actions menu is open
- THEN Import and Export buttons MUST always be enabled
- AND "Copy selected" and "Delete selected" buttons MUST be disabled when `selectedIds.length < 1`
- AND disabled mass actions MUST show a native title tooltip explaining why (e.g. "Select 1 or more items to copy")
- AND the CSS MUST override Nextcloud's `pointer-events: none` on `.action--disabled` so the tooltip is visible on hover
- AND each mass action visibility MUST be toggleable via `showMassImport`, `showMassExport`, `showMassCopy`, `showMassDelete` props
- AND a `#mass-actions` slot MUST allow custom mass action items

#### Scenario: View mode toggle

- GIVEN `showViewToggle=true`
- THEN a Cards/Table toggle MUST appear using NcCheckboxRadioSwitch with `button-variant`, `type="radio"`, `button-variant-grouped="horizontal"`
- AND `@view-mode-change` MUST emit `'cards'` or `'table'` when toggled
- AND `viewMode` prop MUST control the active state

#### Scenario: Count display

- GIVEN `pagination` prop with `total > 0`
- THEN "Showing X of Y" MUST appear, where X is `objectCount` and Y is `pagination.total`

### REQ-LC-003: CnIndexSidebar — Index Page Sidebar

CnIndexSidebar MUST provide a sidebar with search, faceted filters, and column visibility management via tabs.

#### Scenario: Sidebar rendering

- GIVEN the sidebar is visible
- THEN it MUST show title derived from `schema.title` (or `title` prop override)
- AND description derived from `schema.description`
- AND a schema icon in the header colored with `var(--color-primary-element)` (theme-aware, no background)

#### Scenario: Search tab

- GIVEN the Search tab is active
- THEN a search text field MUST appear with configurable placeholder
- AND schema-driven faceted filters MUST appear below
- AND each filter MUST show a single visible label (heading) with an optional info popover
- AND the NcSelect dropdown MUST use `placeholder="Select..."` (NOT the filter label)
- AND the NcSelect `input-label` MUST be set for screen-reader accessibility but visually hidden via CSS
- AND `@search` MUST emit when the search value changes
- AND `@filter-change({ key, values })` MUST emit when filter selection changes

#### Scenario: Columns tab

- GIVEN the Columns tab is active
- THEN column visibility toggles MUST appear grouped by schema properties and metadata (from METADATA_COLUMNS constant)
- AND groups MUST be expandable/collapsible with "select all" toggles
- AND `@columns-change(visibleColumns)` MUST emit when toggled

---

## Requirements

### REQ-LC-004: CnPageHeader — Icon Slot Override and Sizing

CnPageHeader MUST support custom icon rendering via an `#icon` slot and a configurable `iconSize` prop.

#### Scenario: Custom icon via slot

- GIVEN a consumer provides content in the `#icon` slot
- WHEN CnPageHeader renders
- THEN the slot content MUST replace the default CnIcon rendering
- AND the default CnIcon MUST NOT render when `#icon` slot content is present

#### Scenario: Icon size configuration

- GIVEN the `iconSize` prop is set to a numeric value (e.g. `36`)
- WHEN CnPageHeader renders with an `icon` prop
- THEN the CnIcon MUST render at the specified pixel size
- AND when `iconSize` is not provided, it MUST default to `28`

#### Scenario: Conditional icon display

- GIVEN neither the `icon` prop nor `#icon` slot content is provided
- WHEN CnPageHeader renders
- THEN the icon container element (`cn-page-header__icon`) MUST NOT be rendered in the DOM

### REQ-LC-005: CnActionsBar — Header Actions Slot and Scoped Mass Actions

CnActionsBar MUST support a `#header-actions` slot for additional buttons and a scoped `#mass-actions` slot providing selection context.

#### Scenario: Header actions slot

- GIVEN a consumer provides content in the `#header-actions` slot
- WHEN CnActionsBar renders
- THEN the slot content MUST appear after the NcActions dropdown in the actions row
- AND the content MUST be positioned using flexbox alongside the other action controls

#### Scenario: Scoped mass actions slot

- GIVEN the `#mass-actions` slot is used
- WHEN the actions menu is open
- THEN the slot MUST receive `count` (Number) and `selectedIds` (Array) as scoped slot props
- AND consumer-provided NcActionButton items MUST appear after the built-in mass actions in the dropdown

### REQ-LC-006: CnFilterBar — Search and Filter Controls Row

CnFilterBar MUST provide a search input with configurable placeholder and support select, text, and checkbox filter types.

#### Scenario: Search input rendering

- GIVEN CnFilterBar renders with `searchValue` and `searchPlaceholder` props
- THEN an NcTextField MUST appear with a Magnify search icon
- AND a trailing close button MUST appear when `searchValue` is non-empty
- AND clicking the close button MUST emit `@search` with an empty string
- AND typing in the field MUST emit `@search` with the current input value

#### Scenario: Filter type support

- GIVEN the `filters` prop contains filter definitions
- WHEN a filter has `type: 'select'`
- THEN an NcSelect dropdown MUST render with `placeholder` set to the filter's `label`
- AND `input-label` MUST be set for accessibility
- AND `clearable` MUST be true
- WHEN a filter has `type: 'text'`
- THEN an NcTextField MUST render with the filter's label
- WHEN a filter has `type: 'checkbox'`
- THEN an NcCheckboxRadioSwitch MUST render showing the filter's label

#### Scenario: Filter change emission

- GIVEN a user changes any filter value
- WHEN the change completes
- THEN `@filter-change` MUST emit with an object `{ key, value }` where `key` is the filter's key and `value` is the new value

#### Scenario: Clear all filters

- GIVEN `showClearAll` is true (default) and at least one filter has a non-empty value or search is non-empty
- THEN a "Clear filters" button MUST appear (label configurable via `clearAllLabel`)
- AND clicking it MUST emit `@clear-all`
- AND when no filters are active and search is empty, the button MUST be hidden

### REQ-LC-007: CnFacetSidebar — Schema-Driven Faceted Filter Sidebar

CnFacetSidebar MUST auto-generate faceted filter groups from schema properties marked `facetable: true` with live count data support.

#### Scenario: Schema-driven filter generation

- GIVEN a `schema` prop with properties marked `facetable: true`
- WHEN CnFacetSidebar renders
- THEN it MUST auto-generate filter groups using `filtersFromSchema(schema, { isAdmin })`
- AND each group MUST display a label in uppercase, 12px, using `var(--color-text-maxcontrast)`
- AND the sidebar MUST have a fixed width between 240px and 300px with a right border using `var(--color-border)`

#### Scenario: Live facet data with counts

- GIVEN `facetData` contains `{ fieldName: { values: [{ value, count }] } }`
- WHEN a select filter renders for that field
- THEN its options MUST display as `"value (count)"` labels
- AND when `facetData` has no entry for a field, the filter MUST fall back to static enum options from the schema

#### Scenario: Multi-select facet filters

- GIVEN a facet filter of type `select`
- WHEN the user interacts with the NcSelect
- THEN `:multiple="true"` MUST be set allowing multiple value selection
- AND `@filter-change` MUST emit `{ key, values }` where values is an array of selected option IDs

#### Scenario: Loading state

- GIVEN `loading` is true
- WHEN CnFacetSidebar renders
- THEN an NcLoadingIcon MUST appear centered in the sidebar
- AND the filter groups MUST NOT render until loading completes

#### Scenario: RBAC filter visibility

- GIVEN `userIsAdmin` is false
- WHEN the schema contains properties with `adminOnly: true`
- THEN those properties MUST be excluded from the generated filters

#### Scenario: Clear all facet filters

- GIVEN at least one filter has an active value (non-null, non-empty array)
- THEN a "Clear all" button MUST appear in the sidebar header (tertiary style)
- AND clicking it MUST emit `@clear-all`
- AND when no filters are active, the button MUST be hidden

### REQ-LC-008: CnMassActionBar — Floating Mass Action Dropdown

CnMassActionBar MUST render a floating NcActions dropdown with configurable mass action buttons when items are selected.

#### Scenario: Conditional visibility

- GIVEN `count` is 0
- WHEN CnMassActionBar renders
- THEN the component MUST NOT render any DOM (via `v-if="count > 0"`)
- AND when `count` is greater than 0, the NcActions dropdown MUST appear

#### Scenario: Menu label with count

- GIVEN `menuLabelTemplate` defaults to `"Mass Actions ({count})"`
- WHEN 5 items are selected
- THEN the dropdown button label MUST read `"Mass Actions (5)"`
- AND the `{count}` placeholder MUST be replaced with the actual count value
- AND a TuneVariant icon MUST appear as the dropdown button icon

#### Scenario: Built-in action toggle props

- GIVEN any of `showImport`, `showExport`, `showCopy`, `showDelete` is set to false
- WHEN the dropdown opens
- THEN the corresponding NcActionButton MUST NOT render
- AND when set to true (default), the button MUST render with its label (`importLabel`, `exportLabel`, `copyLabel`, `deleteLabel`)
- AND each button label MUST be configurable via its respective prop (defaults: "Import", "Export", "Copy", "Delete")

#### Scenario: Mass action events

- GIVEN a user clicks a built-in mass action button
- THEN the component MUST emit the corresponding event: `@mass-import`, `@mass-export`, `@mass-copy`, or `@mass-delete`
- AND NO payload is included in the event (the parent holds the selectedIds)

#### Scenario: Custom actions slot

- GIVEN a consumer provides content in the `#actions` scoped slot
- THEN the slot MUST receive `count` (Number) and `selectedIds` (Array) as scoped props
- AND consumer NcActionButton items MUST appear after the built-in Delete action in the dropdown

### REQ-LC-009: CnIndexSidebar — Additional Slots and Tab Management

CnIndexSidebar MUST support extension slots for search and columns tabs, custom tabs, and configurable default tab selection.

#### Scenario: Search tab extension slots

- GIVEN the Search tab is active
- THEN a `#search-above` slot MUST render content above the search field (e.g. hints, quick actions)
- AND a `#search-extra` slot MUST render content below the search field and filters (e.g. saved searches)

#### Scenario: Columns tab extension slot

- GIVEN the Columns tab is active
- THEN a `#columns-extra` slot MUST render content below the column visibility controls

#### Scenario: Custom tabs

- GIVEN a consumer provides NcAppSidebarTab components in the `#tabs` slot
- THEN the custom tabs MUST appear after the built-in Search and Columns tabs
- AND tab navigation MUST work via NcAppSidebar's built-in tab panel semantics

#### Scenario: Default tab and tab change event

- GIVEN `defaultTab` is set to `"columns-tab"`
- WHEN the sidebar opens
- THEN the Columns tab MUST be the initially active tab
- AND when the user switches tabs, `@tab-change(tabId)` MUST emit with the new active tab ID
- AND `defaultTab` defaults to `"search-tab"` when not provided

### REQ-LC-010: CnIndexSidebar — Facet Data and Active Filters

CnIndexSidebar MUST support pre-selected active filters and live facet data with value counts.

#### Scenario: Active filter state management

- GIVEN `activeFilters` prop contains `{ status: ["active", "pending"] }`
- WHEN the Search tab renders the status filter
- THEN the NcSelect MUST show "active" and "pending" as pre-selected options
- AND when the user changes the selection, `@filter-change({ key, values })` MUST emit with the updated array

#### Scenario: Facet data integration

- GIVEN `facetData` prop contains `{ status: { values: [{ value: "active", count: 12 }, { value: "pending", count: 3 }] } }`
- WHEN the status filter renders
- THEN the NcSelect options MUST display `"active (12)"` and `"pending (3)"` as labels
- AND when `facetData` is empty, the filter MUST fall back to static enum options from the schema

### REQ-LC-011: CnIndexSidebar — Column Groups and Metadata

CnIndexSidebar MUST support external column groups, metadata columns, and per-column visibility toggling.

#### Scenario: External column groups

- GIVEN `columnGroups` contains `[{ id: "relations", label: "Relations", columns: [{ key: "org", label: "Organization" }] }]`
- WHEN the Columns tab renders
- THEN the "Relations" group MUST appear as a collapsible card after the built-in groups
- AND each group card MUST have a chevron icon (ChevronDown/ChevronRight) indicating expanded/collapsed state
- AND each group MUST include a "select all" toggle (NcCheckboxRadioSwitch labeled "All")

#### Scenario: Metadata group visibility

- GIVEN `showMetadata` is true (default) and a schema is provided
- THEN a "Metadata" column group MUST appear using the METADATA_COLUMNS constant
- AND when `showMetadata` is false, the Metadata group MUST NOT render

#### Scenario: Column toggle emission

- GIVEN the user toggles a single column checkbox
- THEN `@columns-change` MUST emit with the full array of visible column keys (the updated set)
- AND when `visibleColumns` is null, all columns MUST display as checked (all-visible default)

### REQ-LC-012: NL Design System Theming Compatibility

All layout components MUST use Nextcloud CSS variables exclusively for colors and spacing, ensuring NL Design System compatibility.

#### Scenario: CSS variable usage across all layout components

- GIVEN the nldesign app is active and overrides Nextcloud CSS variables
- WHEN any layout component renders
- THEN CnPageHeader icon color MUST use `var(--color-primary)`
- AND CnPageHeader description MUST use `var(--color-text-maxcontrast)`
- AND CnActionsBar background MUST use `var(--color-background-hover)` and border radius `var(--border-radius)`
- AND CnActionsBar count text MUST use `var(--color-text-maxcontrast)`
- AND CnFacetSidebar border MUST use `var(--color-border)` and labels MUST use `var(--color-text-maxcontrast)`
- AND CnIndexSidebar header icon MUST use `var(--color-primary-element)`
- AND CnIndexSidebar group headers MUST use `var(--color-background-hover)` on hover and `var(--color-border)` for borders
- AND NO component MUST reference `--nldesign-*` variables directly (theming works via Nextcloud variable overrides)

### REQ-LC-013: Accessibility — Keyboard and Screen Reader Support

All layout components MUST meet WCAG AA requirements for keyboard navigation, screen reader labels, and accessible controls.

#### Scenario: Screen reader accessible filter labels

- GIVEN CnIndexSidebar renders a faceted filter with NcSelect
- THEN `input-label` MUST be set to the filter's label text for screen reader announcement
- AND the visual label MUST be rendered as a heading above the select
- AND the NcSelect's rendered `<label>` element MUST be visually hidden using a CSS `clip` technique (1px/1px absolute positioning)

#### Scenario: Info popover accessibility

- GIVEN a filter has a `description` property
- THEN the info button MUST have `aria-label` set to `"{filter.label} info"`
- AND the popover MUST use `popup-role="dialog"` for correct ARIA semantics

#### Scenario: Disabled action tooltip accessibility

- GIVEN a mass action button in CnActionsBar is disabled
- THEN the `.action--disabled` CSS MUST set `pointer-events: auto` so hover events fire
- AND `cursor: not-allowed` MUST indicate the disabled state visually
- AND the native `title` attribute MUST provide the explanation text (e.g. "Select 1 or more items to copy")

#### Scenario: View toggle keyboard interaction

- GIVEN CnActionsBar renders the Cards/Table view toggle
- THEN the toggle MUST use `type="radio"` with grouped button variant
- AND keyboard arrow keys MUST navigate between the radio options (provided by NcCheckboxRadioSwitch)
- AND the `name` attribute MUST be set to `"cn_view_mode"` to group the radio buttons

### REQ-LC-014: CnPageHeader — Semantic HTML and Layout

CnPageHeader MUST use semantic HTML elements and flexbox layout for proper document outline and visual hierarchy.

#### Scenario: Heading hierarchy

- GIVEN CnPageHeader renders
- THEN the title MUST be wrapped in an `<h1>` element for correct document outline
- AND the description MUST be wrapped in a `<p>` element
- AND the `<h1>` MUST use `font-size: 2rem` and `font-weight: 300` for visual hierarchy

#### Scenario: Flexbox layout

- GIVEN CnPageHeader renders with an icon
- THEN the icon container MUST be `flex-shrink: 0` to prevent squishing
- AND the text container MUST be `flex: 1` with `min-width: 0` to allow text truncation
- AND spacing between icon and text MUST use `gap` with `--default-grid-baseline` multiples

### REQ-LC-015: CnIndexSidebar — Open State and RBAC

CnIndexSidebar MUST synchronize open state via the `.sync` modifier and support RBAC-based filter visibility.

#### Scenario: Open state synchronization

- GIVEN the `open` prop is bound with `.sync` modifier
- WHEN the user closes the sidebar via the NcAppSidebar close button
- THEN `@update:open` MUST emit with `false`
- AND the internal open state MUST track the external prop via a watcher

#### Scenario: Admin-only filter hiding

- GIVEN `userIsAdmin` is false
- WHEN the schema contains properties with `adminOnly: true`
- THEN those properties MUST be excluded from the generated search filters
- AND the same RBAC filtering MUST apply in both CnIndexSidebar and CnFacetSidebar

---

## Current Implementation Status

**Already implemented (all six components exist and match the spec closely):**

- **CnPageHeader** (`src/components/CnPageHeader/CnPageHeader.vue`): Renders CnIcon with `icon` prop, `h1` title, optional description, and `#extra` slot. Supports `iconSize` prop and `#icon` slot for custom icon rendering. Conditional icon container rendering via `v-if="icon || $slots.icon"`.
- **CnActionsBar** (`src/components/CnActionsBar/CnActionsBar.vue`): Standalone primary NcButton for Add action with configurable `addIcon`/`addLabel`, Plus fallback icon. Unified NcActions dropdown with Refresh first, `#action-items` slot, separator when `selectable=true`. Mass actions (Import, Export, Copy selected, Delete selected) with `:disabled` and `:title` tooltip. View mode toggle with NcCheckboxRadioSwitch. Count display ("Showing X of Y"). `#header-actions` slot and `#mass-actions` scoped slot with `count` and `selectedIds` props.
- **CnFilterBar** (`src/components/CnFilterBar/CnFilterBar.vue`): Search input with NcTextField and Magnify icon, trailing close button. Supports `select`, `text`, and `checkbox` filter types. Emits `@search`, `@filter-change({ key, value })`, `@clear-all`. Configurable `clearAllLabel` and `showClearAll`. Active filter detection for conditional clear button.
- **CnFacetSidebar** (`src/components/CnFacetSidebar/CnFacetSidebar.vue`): Schema-driven filter generation via `filtersFromSchema()`. Live facet data with count labels. Multi-select NcSelect filters. Loading state with NcLoadingIcon. RBAC via `userIsAdmin` prop. Clear all button with active filter detection. Fixed width (240-300px) with border-right.
- **CnMassActionBar** (`src/components/CnMassActionBar/CnMassActionBar.vue`): Conditional render via `v-if="count > 0"`. NcActions dropdown with TuneVariant icon. Dynamic label via `menuLabelTemplate` with `{count}` placeholder. Toggleable built-in actions (Import, Export, Copy, Delete) with configurable labels. `#actions` scoped slot with `count` and `selectedIds`. Emits `@mass-import`, `@mass-export`, `@mass-copy`, `@mass-delete`.
- **CnIndexSidebar** (`src/components/CnIndexSidebar/CnIndexSidebar.vue`): Title/description from schema, schema icon in header colored via CSS. Search tab with text field, schema-driven faceted filters using NcSelect with `placeholder="Select..."` and `input-label` for accessibility. Info popover for filter descriptions with `aria-label`. Columns tab with collapsible groups (schema properties + Metadata from METADATA_COLUMNS constant) and "select all" toggles. Emits `@search`, `@filter-change`, `@columns-change`, `@tab-change`. Supports `activeFilters`, `facetData`, `columnGroups`, `showMetadata`, `userIsAdmin` (RBAC), `defaultTab`, `open` with `.sync`. Slots: `#search-above`, `#search-extra`, `#columns-extra`, `#tabs`.

**Verified in implementation:**
- The CSS file `css/actions-bar.css` confirms the `.action.action--disabled { pointer-events: auto !important; cursor: not-allowed; }` override.
- The CSS file `css/index-sidebar.css` confirms the visually-hidden label technique for NcSelect accessibility.

## Standards & References

- WCAG AA: NcSelect `input-label` provides screen-reader accessible labels; icon-only buttons use `aria-label`; info popovers use `popup-role="dialog"`
- WAI-ARIA: NcAppSidebar provides tab panel semantics via NcAppSidebarTab; radio groups use `name` attribute for grouping
- Vue 2 Options API pattern used throughout
- Nextcloud design guidelines: Uses Nc* components (NcActions, NcButton, NcCheckboxRadioSwitch, NcAppSidebar, NcSelect, NcTextField, NcPopover, NcLoadingIcon)
- NL Design System: All colors use Nextcloud CSS variables (`var(--color-primary-element)`, `var(--color-border)`, `var(--color-background-hover)`, `var(--color-text-maxcontrast)`) — theming works via nldesign variable overrides, no direct `--nldesign-*` references
- CSS class prefix: All classes use `cn-` prefix to avoid collisions with Nextcloud or consumer app styles

## Specificity Assessment

- **Specific enough to implement?** Yes — all six components are fully implemented matching the spec.
- **All slots documented:** `#icon`, `#extra` (PageHeader); `#action-items`, `#mass-actions`, `#header-actions` (ActionsBar); `#actions` (MassActionBar); `#search-above`, `#search-extra`, `#columns-extra`, `#tabs` (IndexSidebar).
- **All events documented:** `@add`, `@refresh`, `@view-mode-change`, `@show-import`, `@show-export`, `@show-copy`, `@show-delete` (ActionsBar); `@search`, `@filter-change`, `@clear-all` (FilterBar, FacetSidebar); `@mass-import`, `@mass-export`, `@mass-copy`, `@mass-delete` (MassActionBar); `@search`, `@filter-change`, `@columns-change`, `@tab-change`, `@update:open` (IndexSidebar).
- **All props documented:** Including `iconSize` (PageHeader), `inlineActionCount` (ActionsBar), `menuLabelTemplate` (MassActionBar), `loading`/`userIsAdmin` (FacetSidebar), `defaultTab`/`facetData`/`activeFilters`/`columnGroups`/`showMetadata`/`propertiesGroupLabel` (IndexSidebar).
