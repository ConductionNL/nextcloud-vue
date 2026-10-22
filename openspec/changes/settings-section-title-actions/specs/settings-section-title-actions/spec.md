# settings-section-title-actions Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [settings-section-title-actions](../../)

## ADDED Requirements

### Requirement: A settings section can draw its actions in its title row

A CnSettingsSection with `actionsInTitle` and an `actions` slot SHALL draw the heading and the actions in one row, the
actions at the end, and the description and the content below across the width. Without `actionsInTitle` the section
SHALL keep its layout.

#### Scenario: VTH fee rules

- **GIVEN** the fee rules section with "Regel toevoegen" in its actions and `actionsInTitle`
- **THEN** the button sits beside the heading "Legesregels"

### Requirement: A working calendar can leave Add day to its host

A working calendar with `content.addButton: false` SHALL NOT draw its Add day button, and its `openAdd()` SHALL still
open the form for an administrator.

#### Scenario: Working days in a settings section

- **GIVEN** the calendar with `addButton: false` in a section whose title row draws "Dag toevoegen"
- **WHEN** the administrator presses "Dag toevoegen"
- **THEN** the calendar's add form opens
