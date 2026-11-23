# settings-board-look Delta: admin-shell-sub-tabs

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [admin-shell-sub-tabs](../../)

## Purpose

A tab of the admin page can be split into tabs of its own.

## ADDED Requirements

### Requirement: A tab can hold its own tab strip

When a shell tab declares `tabs`, `CnAdminSettingsShell` SHALL draw a second tab strip in that tab's panel, after its `tab-<id>` slot, with each tab's label and count, in the shell's look and variant, named after the tab. Each inner panel SHALL be the `tab-<id>-<subId>` slot. The first inner tab SHALL be open unless the address names another (`?<subTabQueryKey>=<subId>`); opening one SHALL write it to the address and emit `sub-tab-change` with both ids. With `lazyTabs` only the open inner panel SHALL be mounted. A tab without `tabs` SHALL render as before.

#### Scenario: Klantportaal

- **GIVEN** the tab Klantportaal with inner tabs Portalen (3) and Auditlog (1284)
- **WHEN** the administrator opens Auditlog
- **THEN** the address reads `?tab=portal&subtab=audit` and a reload opens Auditlog again
