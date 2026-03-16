# Layout Components — Spec

## Purpose
Specifies the page layout components: CnPageHeader, CnActionsBar, CnIndexSidebar.

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

### REQ-LC-003: CnIndexSidebar — Index Page Sidebar

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

### Current Implementation Status

**Already implemented (all three components exist and match the spec closely):**

- **CnPageHeader** (`src/components/CnPageHeader/CnPageHeader.vue`): Renders CnIcon with `icon` prop, `h1` title, optional description, and `#extra` slot. Also supports `iconSize` prop (not in spec) and `#icon` slot for custom icon rendering.
- **CnActionsBar** (`src/components/CnActionsBar/CnActionsBar.vue`): Standalone primary NcButton for Add action with configurable `addIcon`/`addLabel`, Plus fallback icon. Unified NcActions dropdown with Refresh first, `#action-items` slot, separator when `selectable=true`. Mass actions (Import, Export, Copy selected, Delete selected) with `:disabled` and `:title` tooltip. View mode toggle with NcCheckboxRadioSwitch. Count display ("Showing X of Y"). Also has `#header-actions` slot and `#mass-actions` scoped slot (not in spec).
- **CnIndexSidebar** (`src/components/CnIndexSidebar/CnIndexSidebar.vue`): Title/description from schema, schema icon in header colored via CSS. Search tab with text field, schema-driven faceted filters using NcSelect with `placeholder="Select..."` and `input-label` for accessibility. Info popover for filter descriptions. Columns tab with collapsible groups (schema properties + Metadata from METADATA_COLUMNS constant) and "select all" toggles. Emits `@search`, `@filter-change`, `@columns-change`. Also supports `activeFilters`, `facetData`, `columnGroups`, `showMetadata`, `userIsAdmin` (RBAC), `#search-above`, `#search-extra`, `#columns-extra`, `#tabs` slots.

**Not yet implemented:**
- The spec mentions CSS overriding `pointer-events: none` on `.action--disabled` for tooltip visibility — needs verification whether the current CSS includes this override.

### Standards & References

- WCAG AA: NcSelect `input-label` provides screen-reader accessible labels; icon-only buttons use `aria-label`
- WAI-ARIA: NcAppSidebar provides tab panel semantics via NcAppSidebarTab
- Vue 2 Options API pattern used throughout
- Nextcloud design guidelines: Uses Nc* components (NcActions, NcButton, NcCheckboxRadioSwitch, NcAppSidebar, NcSelect, NcTextField, NcPopover)
- NL Design System: All colors use Nextcloud CSS variables (`var(--color-primary-element)`, `var(--color-border)`)

### Specificity Assessment

- **Specific enough to implement?** Yes — all three components are already fully implemented matching the spec.
- **Missing/ambiguous:**
  - REQ-LC-002 does not mention the `#header-actions` slot or `#mass-actions` scoped slot that exist in the implementation.
  - REQ-LC-003 does not mention `activeFilters`, `facetData` props, `userIsAdmin` RBAC filtering, or additional slots (`#search-above`, `#search-extra`, `#columns-extra`, `#tabs`).
  - No mention of the `defaultTab` prop or tab-change event.
- **Open questions:**
  - Should the spec be updated to document the additional slots and props that already exist?
