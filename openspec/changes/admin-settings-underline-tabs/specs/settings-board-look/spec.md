# settings-board-look Delta: admin-settings-underline-tabs

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [admin-settings-underline-tabs](../../)

## Purpose

An admin settings page can draw its tab strip the way board LpBeheerAlgemeen does.

## ADDED Requirements

### Requirement: The admin shell can draw an underline tab strip

`CnTabs` SHALL accept `variant: "underline"`, drawing each tab as a label without a fill or a frame on the strip's rule, 44px high, with a 3px bottom border that is the primary colour on the open tab and transparent on the others, the open tab bold. The strip SHALL wrap onto a further row instead of scrolling. `CnAdminSettingsShell` SHALL accept `tabsVariant` (`line` or `underline`, default `line`) and pass it to its strip as `variant`. Without `tabsVariant` the shell SHALL draw the folder strip as before. Roles, keyboard behaviour, the address and the first-tab chrome SHALL be the same in both.

#### Scenario: Launchpad's admin page with an underline strip

- **GIVEN** a shell with `tabsVariant: "underline"` and tabs Algemeen, Sjablonen and Delen
- **THEN** the open tab Algemeen has a 3px primary bottom border and no fill, and Sjablonen has a transparent bottom border
- **WHEN** the reader presses ArrowRight on the open tab
- **THEN** Sjablonen is open and underlined, and the address reads `?tab=sjablonen`

#### Scenario: The default stays folder tabs

- **GIVEN** a shell with `tabs` and no `tabsVariant`
- **THEN** the strip is the folder strip it drew before
