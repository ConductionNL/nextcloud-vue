# settings-board-look Delta: admin-shell-remembers-tab

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [admin-shell-remembers-tab](../../)

## Purpose

An admin page with tabs can open on the tab the administrator used last.

## ADDED Requirements

### Requirement: The admin shell can remember the last tab

With `tabStorageKey`, CnAdminSettingsShell SHALL store the id of each tab the reader opens under that key, and SHALL open
on the stored tab when the address names no tab. A tab named in the address SHALL win. Without `tabStorageKey` the
shell SHALL store and read nothing.

#### Scenario: Back on the admin page

- **GIVEN** an administrator opened the "Sharing" tab last time
- **WHEN** they open the admin page without `?tab=`
- **THEN** the "Sharing" tab is open
