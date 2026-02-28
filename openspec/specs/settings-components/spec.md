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
