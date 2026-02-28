# Layout Components — Spec

## Purpose
Specifies the page layout components: CnPageHeader, CnActionsBar, CnListViewLayout, CnDetailViewLayout, CnIndexSidebar.

---

## Requirements

### REQ-LC-001: CnPageHeader — Page Title Block

#### Scenario: Header rendering

- GIVEN props `title="Clients"`, `description="Manage clients"`, `icon="AccountGroup"`
- WHEN CnPageHeader renders
- THEN it MUST show a CnIcon with the icon name
- AND the title in an appropriate heading element
- AND the description below the title
- AND an `#extra` slot for additional header content

### REQ-LC-002: CnActionsBar — Action Bar

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

### REQ-LC-003: CnListViewLayout — List Page Wrapper

#### Scenario: Layout structure

- GIVEN CnListViewLayout is used
- THEN it MUST provide a flex layout with optional sidebar
- AND main content area for table/cards/pagination

### REQ-LC-004: CnDetailViewLayout — Detail Page Layout

#### Scenario: Detail layout

- GIVEN CnDetailViewLayout is used
- THEN it MUST provide a back button, title area, action buttons, and content slot

### REQ-LC-005: CnIndexSidebar — Index Page Sidebar

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
