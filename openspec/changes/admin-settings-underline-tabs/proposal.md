---
kind: code
---

# Proposal: admin-settings-underline-tabs

## Summary

Board LpBeheerAlgemeen draws the admin tab strip as plain labels on a 1px rule, the open tab bold with a 3px primary underline, 44px high, wrapping onto a second row (#1638). CnAdminSettingsShell drew every `tabs` strip as folder tabs.

`CnTabs` gains `variant: "underline"`, and `CnAdminSettingsShell` gains `tabsVariant` (`line`, the default folder strip, or `underline`) that it passes on. Without `tabsVariant` nothing changes.

## Scope

- `src/components/CnTabs/CnTabs.vue`: the `underline` variant and its styles.
- `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`: `tabsVariant`.
- No manifest schema change (the shell is configured by props; CnTabsWidget keeps `line` and `segmented`).
