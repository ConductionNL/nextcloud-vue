---
status: reviewed
---

# Settings Components — Spec

## Purpose
Specifies the admin settings components: CnSettingsCard, CnSettingsSection, CnConfigurationCard, CnVersionInfoCard, CnStatsBlock, and CnRegisterMapping. These components provide a consistent, themeable settings page layout for all Conduction Nextcloud apps.

---

## Requirements

### REQ-SC-001: CnSettingsCard — Collapsible Settings Card

CnSettingsCard MUST support collapsible content sections with animated expand/collapse transitions and toggle event emission.

#### Scenario: Collapsible behavior

- GIVEN a CnSettingsCard with `title` set and `collapsible` set to true
- WHEN the user clicks the header
- THEN the card content MUST toggle between expanded and collapsed states
- AND a ChevronDown icon MUST be shown when expanded, ChevronUp when collapsed
- AND the transition MUST use a slide-fade animation (`cn-slide-fade`)

#### Scenario: Default collapsed state

- GIVEN a CnSettingsCard with `collapsible` set to true and `defaultCollapsed` set to true
- WHEN the component mounts
- THEN the card content MUST be collapsed initially
- AND the ChevronUp icon MUST be displayed

#### Scenario: Non-collapsible card

- GIVEN a CnSettingsCard with `collapsible` set to false (default)
- WHEN the component renders
- THEN the content MUST always be visible without transition wrapper
- AND no chevron icons MUST be rendered
- AND clicking the header MUST NOT trigger any toggle behavior

#### Scenario: Toggle event emission

- GIVEN a collapsible CnSettingsCard
- WHEN the user clicks the header to toggle
- THEN a `@toggle` event MUST be emitted with the current `isCollapsed` boolean value

#### Scenario: Icon and title display

- GIVEN a CnSettingsCard with `icon` set to an emoji string (e.g. "🗄️") and `title` set
- WHEN the component renders
- THEN the header MUST display the icon followed by a space and the title text within an `<h4>` element

---

### REQ-SC-002: CnSettingsSection — Settings Section Container

CnSettingsSection MUST wrap content in `NcSettingsSection` and support loading, error, and empty states with configurable messages and retry actions.

#### Scenario: Section grouping with NcSettingsSection

- GIVEN a CnSettingsSection with `name` (required), optional `description`, and optional `docUrl`
- WHEN the component renders
- THEN it MUST wrap content in an `NcSettingsSection` from `@nextcloud/vue`
- AND the `name`, `description`, and `doc-url` props MUST be forwarded to `NcSettingsSection`
- AND additional `$attrs` MUST be forwarded via `v-bind="$attrs"` (with `inheritAttrs: false`)

#### Scenario: Actions slot positioned top-right

- GIVEN a CnSettingsSection with content in the `#actions` slot
- WHEN the component renders
- THEN the actions MUST be positioned top-right of the section using float and negative margin
- AND on screens narrower than 768px, the actions MUST stack vertically below the title

#### Scenario: Loading state

- GIVEN a CnSettingsSection with `loading` set to true
- WHEN the component renders
- THEN an `NcLoadingIcon` spinner (size 32) MUST be displayed centered
- AND the `loadingMessage` prop text MUST be shown below the spinner (default: "Loading...")

#### Scenario: Error state with retry

- GIVEN a CnSettingsSection with `error` set to true and `loading` set to false
- WHEN the component renders
- THEN the `errorMessage` prop text MUST be displayed (default: "An error occurred")
- AND the error MUST be styled with `--color-error-light` background and `--color-error` border
- AND if an `onRetry` function prop is provided, a "Retry" button (or `retryButtonText`) MUST be shown
- AND if `onRetry` is null, no retry button MUST be rendered

#### Scenario: Empty state

- GIVEN a CnSettingsSection with `empty` set to true and both `loading` and `error` set to false
- WHEN the component renders
- THEN the `emptyMessage` prop text MUST be displayed (default: "No data available")
- AND an InformationOutline icon (size 48) MUST be shown above the message
- AND the empty state MUST be overridable via the `#empty` slot

#### Scenario: Footer slot

- GIVEN a CnSettingsSection with content in the `#footer` slot
- WHEN the component renders
- THEN the footer MUST be separated from the content by a top border (`--color-border`) with 24px margin and padding

---

## ADDED Requirements

### Requirement: CnConfigurationCard — Slot-Based Configuration Card

CnConfigurationCard MUST render a card with header, icon, actions, status, content, and footer slots for flexible configuration display.

#### Scenario: Card structure with slots

- GIVEN a CnConfigurationCard with a `title` prop
- WHEN the component renders
- THEN the card MUST display an `<h3>` header containing the title
- AND the `#icon` slot content MUST render before the title text within the `<h3>`
- AND the `#actions` slot content MUST render in the header row to the right of the title
- AND the `#status` slot content MUST render below the header (for CnStatusBadge or similar)
- AND the default slot MUST render the main content area
- AND the `#footer` slot MUST render with a top border separator when provided

#### Scenario: Status via slot not prop

- GIVEN a CnConfigurationCard
- WHEN a consumer needs to display connection status
- THEN the consumer MUST provide status display via the `#status` slot (not a prop)
- AND the status area MUST use flexbox with 8px gap for multiple badges

---

### Requirement: CnVersionInfoCard — Version Information Display

CnVersionInfoCard MUST display application name, version, optional configured version, update button with state indicators, and additional info items.

#### Scenario: Version details rendering

- GIVEN a CnVersionInfoCard with required `appName` and `appVersion` props
- WHEN the component renders
- THEN the card MUST wrap content in a CnSettingsSection with configurable `title` (default: "Version Information") and `description`
- AND a version info card MUST display "Application Name" and "Version" as key-value rows
- AND values MUST use monospace font (`Courier New`)
- AND each row MUST have a bottom border separator except the last row

#### Scenario: Configured version display

- GIVEN a CnVersionInfoCard with `configuredVersion` prop set to a non-empty string
- WHEN the component renders
- THEN a "Configured Version" row MUST be displayed below the version row
- AND all field labels MUST be customizable via the `labels` object prop (keys: `appName`, `version`, `configuredVersion`)

#### Scenario: Update button states

- GIVEN a CnVersionInfoCard with `showUpdateButton` set to true
- WHEN `isUpToDate` is true
- THEN the button MUST show a Check icon, text "Up to date", type "success", and be disabled
- WHEN `isUpToDate` is false and `updating` is false
- THEN the button MUST show an Update icon, text "Update", and type "error"
- WHEN `updating` is true
- THEN the button MUST show an NcLoadingIcon and text "Updating..." and be disabled
- AND clicking the enabled button MUST emit an `@update` event

#### Scenario: Additional items

- GIVEN a CnVersionInfoCard with `additionalItems` array containing objects with `label`, `value`, and optional `statusClass`
- WHEN the component renders
- THEN each item MUST render as a key-value row after the standard version rows
- AND if `statusClass` is provided (e.g. `cn-version-info__status--ok`), it MUST be applied to the value element for color coding

#### Scenario: Responsive version layout

- GIVEN a CnVersionInfoCard displayed on a screen narrower than 768px
- WHEN the component renders
- THEN each key-value row MUST stack vertically (label above value)
- AND values MUST use `word-break: break-all` to prevent overflow

---

### Requirement: CnStatsBlock — Statistics Display Block

CnStatsBlock MUST display a formatted count with variant-colored label, optional breakdown, loading/empty states, and clickable/routeable navigation.

#### Scenario: Count display with formatting

- GIVEN a CnStatsBlock with `count` greater than 0
- WHEN the component renders
- THEN the count MUST be displayed prominently using `toLocaleString()` formatting (e.g. 1,234)
- AND the `countLabel` prop text MUST appear next to the count (default: "objects")
- AND the count value MUST use the variant color (`--color-primary-element` for default/primary, `--color-success`, `--color-warning`, `--color-error`)

#### Scenario: Breakdown key-value display

- GIVEN a CnStatsBlock with a `breakdown` object prop (e.g. `{ total: 100, invalid: 3, deleted: 5, published: 92 }`) and `count` greater than 0
- WHEN the component renders
- THEN each breakdown entry MUST render as a label-value pair
- AND labels MUST be capitalized with a colon suffix (e.g. "Total:", "Invalid:")
- AND the values for keys "invalid", "deleted", and "published" MUST use `--color-warning`, `--color-error`, and `--color-success` respectively

#### Scenario: Loading and empty states

- GIVEN a CnStatsBlock with `loading` set to true
- WHEN the component renders
- THEN an NcLoadingIcon (size 16) MUST be displayed with the `loadingLabel` text (default: "Loading...")
- GIVEN a CnStatsBlock with `count` equal to 0 and `loading` set to false
- WHEN the component renders
- THEN the `emptyLabel` text MUST be displayed in italic style (default: "No items found")

#### Scenario: Horizontal layout mode

- GIVEN a CnStatsBlock with `horizontal` set to true
- WHEN the component renders
- THEN the layout MUST use `flex-direction: row` with the icon on the left and content on the right
- AND content text MUST be left-aligned instead of centered

#### Scenario: Clickable and route-based navigation

- GIVEN a CnStatsBlock with `clickable` set to true
- WHEN the component renders
- THEN the root element MUST render as an `<a>` tag with `role="button"` and `tabindex="0"`
- AND hover MUST show a primary-colored border and subtle shadow
- AND `focus-visible` MUST show a 2px primary-colored outline with 2px offset
- AND clicking MUST emit a `@click` event (with `preventDefault`)
- GIVEN a CnStatsBlock with a `route` object prop
- WHEN the component renders
- THEN the root element MUST render as a `<router-link>` with `tabindex="0"` for SPA navigation
- AND clicking MUST NOT emit a `@click` event (router-link handles navigation)

#### Scenario: Icon with variant coloring

- GIVEN a CnStatsBlock with an `icon` component prop and `variant` set to "success"
- WHEN the component renders
- THEN the icon MUST render inside a 44px circular container
- AND the circle background MUST use a light tint of the variant color (e.g. `rgba(70, 186, 97, 0.1)` for success)
- AND the icon color MUST use `--color-success`
- AND consumers MAY override the icon via the `#icon` slot

---

### Requirement: CnRegisterMapping — Register-to-Schema Configuration

CnRegisterMapping MUST provide a self-fetching register/schema configuration interface with group-based selection, auto-matching, and save/reimport actions.

#### Scenario: Self-fetching register data

- GIVEN a CnRegisterMapping component
- WHEN the component mounts
- THEN it MUST fetch registers from `/apps/openregister/api/registers?_extend[]=schemas` using `buildHeaders()`
- AND during loading, `registersLoading` MUST be true and a loading state MUST be shown via CnSettingsSection
- AND on fetch failure, an error message MUST be displayed with a retry button that calls `loadRegisters`

#### Scenario: Group-based register selection

- GIVEN a CnRegisterMapping with a `groups` array containing one or more groups (each with `name`, optional `description`, and `types` array)
- WHEN the component renders
- THEN each group MUST display as a bordered card with a group header showing the name and "X/Y configured" status
- AND each group MUST have an NcSelect dropdown for choosing a register
- AND the group header MUST be overridable via the `#group-header` scoped slot

#### Scenario: Type-to-schema mapping with expandable rows

- GIVEN a group with a selected register and types defined
- WHEN the component renders
- THEN each type MUST display as a grid row showing: name, current schema label (or "Not configured"), a colored status dot (green for configured, amber for unconfigured), and a chevron toggle
- AND clicking a row MUST expand it to reveal an NcSelect for choosing a schema
- AND the expansion MUST use a slide transition animation

#### Scenario: Auto-match schemas on register change

- GIVEN a CnRegisterMapping with `autoMatch` set to true (default)
- WHEN the user selects a new register for a group
- THEN all existing schema selections for that group MUST be cleared
- AND the component MUST attempt to auto-match schemas to types by comparing schema titles to type slugs/labels (case-insensitive substring matching)
- AND a `@update:configuration` event MUST be emitted with the updated config object

#### Scenario: Save and reimport actions

- GIVEN a CnRegisterMapping with `showSaveButton` set to true
- WHEN the local configuration differs from the `configuration` prop
- THEN the save button MUST be enabled
- AND clicking save MUST emit a `@save` event with the current configuration object
- WHEN the configuration has not changed
- THEN the save button MUST be disabled
- GIVEN `showReimportButton` set to true
- WHEN the user clicks the reimport button
- THEN a `@reimport` event MUST be emitted
- AND both buttons MUST show NcLoadingIcon spinners during their respective operations (`saving`, `reimporting` props)

---

### Requirement: NL Design System Theming Compatibility

All settings components MUST use Nextcloud CSS variables for colors, borders, and radii, ensuring NL Design System compatibility without direct `--nldesign-*` references.

#### Scenario: CSS variable usage across all settings components

- GIVEN any settings component (CnSettingsCard, CnSettingsSection, CnConfigurationCard, CnVersionInfoCard, CnStatsBlock, CnRegisterMapping)
- WHEN the component renders with or without the nldesign app active
- THEN all colors MUST use Nextcloud CSS variables (`--color-primary-element`, `--color-border`, `--color-background-hover`, `--color-main-text`, `--color-text-maxcontrast`, `--color-success`, `--color-warning`, `--color-error`, `--color-error-light`)
- AND no hardcoded color values MUST be used for semantic colors
- AND the `--border-radius-large` and `--border-radius` variables MUST be used for border radius values
- AND components MUST NOT reference `--nldesign-*` variables (the nldesign app overrides Nextcloud's own variables)

---

### Requirement: Accessibility

All settings components MUST meet WCAG AA requirements for keyboard navigation, focus indicators, and interactive element feedback.

#### Scenario: Keyboard navigation and ARIA

- GIVEN a CnStatsBlock with `clickable` set to true
- WHEN the component renders
- THEN it MUST have `role="button"` and `tabindex="0"` attributes on the root `<a>` element
- AND `focus-visible` MUST provide a visible 2px outline for keyboard users
- GIVEN a CnSettingsCard with `collapsible` set to true
- WHEN the header is rendered
- THEN the header MUST have a clickable class applied for pointer cursor feedback
- GIVEN a CnRegisterMapping type row
- WHEN the row renders
- THEN the row MUST have `cursor: pointer` and hover background feedback to indicate interactivity

---

### Requirement: Responsive Layout

All settings components MUST adapt their layout for mobile viewports narrower than 768px.

#### Scenario: Mobile-friendly settings layout

- GIVEN a CnSettingsSection rendered on a screen narrower than 768px
- WHEN the viewport triggers the mobile breakpoint
- THEN the `#actions` slot MUST move from float-right to a stacked vertical layout below the title
- GIVEN a CnVersionInfoCard rendered on a screen narrower than 768px
- WHEN the viewport triggers the mobile breakpoint
- THEN key-value rows MUST stack vertically with the label above the value
- GIVEN a CnRegisterMapping rendered on a screen narrower than 768px
- WHEN the viewport triggers the mobile breakpoint
- THEN the column header row MUST be hidden
- AND the schema column in type rows MUST be hidden (grid collapses to 3 columns)
- AND the register select dropdown MUST expand to full width

---

### Requirement: CSS Class Prefix Convention

All settings components MUST use the `cn-` CSS class prefix with BEM naming convention to avoid collisions.

#### Scenario: Collision-safe class naming

- GIVEN any settings component
- WHEN CSS classes are applied
- THEN all component-specific classes MUST use the `cn-` prefix (e.g. `cn-settings-card`, `cn-stats-block`, `cn-config-card`, `cn-version-info`, `cn-register-mapping`)
- AND BEM naming convention MUST be followed (block__element--modifier)

---

## Standards & References

- WCAG AA: CnStatsBlock uses semantic `<a>` with `role="button"` and `tabindex="0"` when clickable; focus-visible outline provided
- Nextcloud design guidelines: CnSettingsSection wraps NcSettingsSection; uses Nextcloud CSS variables throughout
- NL Design System: All colors via CSS variables (`var(--color-primary-element)`, `var(--color-success)`, `var(--color-error)`, etc.)
- Vue 2 Options API pattern
- All text labels accept pre-translated strings via props with English defaults (i18n-ready)
