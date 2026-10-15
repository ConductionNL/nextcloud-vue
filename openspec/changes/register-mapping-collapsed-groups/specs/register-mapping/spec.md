# register-mapping Delta: register-mapping-collapsed-groups

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [register-mapping-collapsed-groups](../../)

## Purpose

A register mapping with several groups is short until the administrator opens the group they need.

## ADDED Requirements

### Requirement: Register groups start closed with their count

When `CnRegisterMapping` holds more than one group (or `collapseGroups` is true), each group's header SHALL be a button inside a level-4 heading with `aria-expanded` and `aria-controls`, showing the group name and its configured count. Every group SHALL start closed, and a click or Enter on the button SHALL open or close that group alone. A closed group SHALL keep its unsaved choices. With one group, or `collapseGroups` false, the groups SHALL render open without a button, as before.

#### Scenario: Pipelinq's admin page

- **GIVEN** a register mapping with the groups Pipelinq Objects (2 of 8 configured), Point of Sale, Appointment Booking and Marketing
- **THEN** the card shows four closed headings reading "2/8 configured", "0/4 configured", "0/3 configured", "0/3 configured"
- **WHEN** the administrator presses Enter on Point of Sale
- **THEN** that group opens and the others stay closed
