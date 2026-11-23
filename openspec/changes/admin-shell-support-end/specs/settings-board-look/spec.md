# settings-board-look Delta: admin-shell-support-end

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [admin-shell-support-end](../../)

## Purpose

The admin page ends with support as the board draws it, and the version card shows the configured version.

## ADDED Requirements

### Requirement: Support can be its own card at the end

With `supportPosition: "end"` `CnAdminSettingsShell` SHALL draw the support and SLA lines as a wide settings card after every other section of the first tab, and SHALL NOT draw them in the version card. In the board look that card SHALL be one row: the title, then the lines, wrapping in a narrow window. With the default `card`, or `showSupport` false, the page SHALL render as before.

#### Scenario: Pipelinq's admin page

- **GIVEN** the shell in the board look with `supportPosition: "end"`
- **THEN** the last card reads "Ondersteuning", the support address and the SLA address, across the full width

### Requirement: The board version card draws the configured version

In the board look `CnVersionInfoCard` SHALL always draw the "Configured version" row, reading the configured version or "Unknown" when the app passes none. The default look SHALL draw the row only for a value.

#### Scenario: No configured version passed

- **THEN** the board version card reads "Ingestelde versie: Onbekend"
