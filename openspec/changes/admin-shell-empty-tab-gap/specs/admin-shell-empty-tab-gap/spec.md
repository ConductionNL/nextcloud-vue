# admin-shell-empty-tab-gap Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [admin-shell-empty-tab-gap](../../)

## Purpose

The first card of an admin settings page stands the same distance under the tab strip on every tab.

## ADDED Requirements

### Requirement: A tab without a panel adds no space under the strip

While the open tab of `CnAdminSettingsShell` has no `tab-<id>` slot, the shell SHALL mark its tab strip
`cn-admin-settings-shell__tabs--bare`, and a bare strip SHALL draw no padding above its (empty) panel. A tab with a
panel keeps the strip's panel spacing.

#### Scenario: The General tab of dossiq's admin settings

- **GIVEN** the dossiq admin settings on the General tab, whose cards follow the strip
- **THEN** the version card stands the section gap (20px) under the strip, as on board DqInstellingenAlgemeen
