# settings-board-look Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [admin-settings-lazy-tabs](../../)

## Purpose

An admin page with expensive tabs loads one tab at a time without wrapping each tab in its own condition.

## ADDED Requirements

### Requirement: The admin shell can mount only the open tab

With `lazyTabs`, CnAdminSettingsShell SHALL mount a tab's `tab-<id>` slot only while that tab is open, and SHALL
unmount it when another tab opens. Without `lazyTabs` it SHALL keep every panel mounted, as before.

#### Scenario: Only the open tab is mounted

- **GIVEN** an admin shell with three tabs and `lazyTabs`
- **THEN** only the first tab's panel content is mounted
- **WHEN** the reader opens the second tab
- **THEN** its panel content mounts and the first tab's unmounts

#### Scenario: A revisited tab mounts afresh

- **GIVEN** a reader who opened the second tab and went back to the first
- **THEN** the first tab's panel content has mounted twice

#### Scenario: The address names a tab

- **GIVEN** an address with `?tab=<third>` and `lazyTabs`
- **THEN** only the third tab's panel content is mounted

#### Scenario: Without lazyTabs

- **GIVEN** an admin shell with three tabs and no `lazyTabs`
- **THEN** every tab's panel content is mounted, as before
