# Settings Components — Spec

## Purpose
Specifies the admin settings components: CnSettingsCard, CnSettingsSection, CnConfigurationCard, CnVersionInfoCard, CnStatsBlock.

---

## Requirements

### REQ-SC-001: CnSettingsCard — Collapsible Settings Card

#### Scenario: Collapsible behavior

- GIVEN a CnSettingsCard with title and content
- WHEN the user clicks the header
- THEN the card content MUST expand/collapse
- AND a chevron indicator MUST show the current state

### REQ-SC-002: CnSettingsSection — Settings Section Container

#### Scenario: Section grouping

- GIVEN multiple CnSettingsCards
- WHEN wrapped in CnSettingsSection
- THEN they MUST be visually grouped with a section title

### REQ-SC-003: CnConfigurationCard — Configuration Card

#### Scenario: Status display

- GIVEN a configuration card with `status` prop
- THEN a status indicator MUST show (connected, error, pending)
- AND action buttons MUST be available for configuration

### REQ-SC-004: CnVersionInfoCard — Version Info Display

#### Scenario: Version rendering

- GIVEN version information (app version, dependencies, build info)
- THEN CnVersionInfoCard MUST display this in a structured layout

### REQ-SC-005: CnStatsBlock — Statistics Display

#### Scenario: Stats rendering

- GIVEN a stats block with count and breakdown data
- THEN the total count MUST be prominently displayed
- AND breakdown items MUST show individual counts
- AND percentage bars SHOULD be shown for each breakdown item

---

### Current Implementation Status

**Already implemented (all five components exist):**

- **CnSettingsCard** (`src/components/CnSettingsCard/CnSettingsCard.vue`): Collapsible card with `title`, `icon` (emoji/text prefix), `collapsible` and `defaultCollapsed` props. Uses ChevronDown/ChevronUp icons. Emits `@toggle` event. Has slide-fade transition animation.
- **CnSettingsSection** (`src/components/CnSettingsSection/CnSettingsSection.vue`): Wraps `NcSettingsSection` from `@nextcloud/vue`. Adds `#actions` slot (positioned top-right), `#description` slot, `#footer` slot, and loading/error/empty states with `loading`, `error`, `empty` props and corresponding message props. Error state includes optional retry button via `onRetry` function prop.
- **CnConfigurationCard** (`src/components/CnConfigurationCard/CnConfigurationCard.vue`): Simple card with `title` prop, `#icon`, `#actions`, `#status`, default content, and `#footer` slots. Status is rendered via slot (not a prop) — consumers provide CnStatusBadge or similar.
- **CnVersionInfoCard** (`src/components/CnVersionInfoCard/CnVersionInfoCard.vue`): Wraps CnSettingsSection. Shows app name, version, optional configured version, update button with states (up-to-date/updating/needs-update), additional key-value items via `additionalItems` array prop, and custom labels. Emits `@update`. Has `#actions`, `#additional-items`, `#footer`, `#extra-cards` slots.
- **CnStatsBlock** (`src/components/CnStatsBlock/CnStatsBlock.vue`): Shows count prominently with `countLabel`, optional breakdown as key-value pairs. Supports `icon` (component), `variant` (default/primary/success/warning/error), `horizontal` layout, `clickable` state, loading/empty states. Uses `#icon` slot for custom icons. No percentage bars (spec says SHOULD).

**Not yet implemented:**
- REQ-SC-005 mentions percentage bars for breakdown items — current implementation shows key-value pairs without percentage visualization.
- REQ-SC-001 mentions "chevron indicator" — implementation uses ChevronDown/ChevronUp (matches spec).

### Standards & References

- WCAG AA: CnStatsBlock uses semantic `<a>` with `role="button"` and `tabindex="0"` when clickable; focus-visible outline provided
- Nextcloud design guidelines: CnSettingsSection wraps NcSettingsSection; uses Nextcloud CSS variables throughout
- NL Design System: All colors via CSS variables (`var(--color-primary-element)`, `var(--color-success)`, `var(--color-error)`, etc.)
- Vue 2 Options API pattern

### Specificity Assessment

- **Specific enough to implement?** Partially — REQ-SC-001 and REQ-SC-005 are well-specified. REQ-SC-002, REQ-SC-003, REQ-SC-004 are very brief and lack prop/event/slot details.
- **Missing/ambiguous:**
  - REQ-SC-002 does not mention loading/error/empty states, `#actions` slot, `#footer` slot, `docUrl` prop, or retry functionality that exist in the implementation.
  - REQ-SC-003 says "status prop" but the actual implementation uses a `#status` slot instead. The spec mentions "action buttons" but does not specify which.
  - REQ-SC-004 does not mention the update button, `additionalItems`, `labels`, or any of the update-related props/events.
  - REQ-SC-005 does not mention icon support, color variants, horizontal layout, clickable state, or loading/empty states.
- **Open questions:**
  - Should percentage bars be added to CnStatsBlock breakdown items as the spec suggests?
  - Should CnConfigurationCard accept a `status` prop or continue using a slot?
