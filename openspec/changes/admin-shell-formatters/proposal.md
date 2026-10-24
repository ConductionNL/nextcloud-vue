---
kind: code
---

# Proposal: admin-shell-formatters

## Summary

A column on an admin settings page names a formatter by id (`relativeDate`, `connectionStatus`, `currency`). `CnCellRenderer` resolves that id against the `cnFormatters` registry, which only `CnAppRoot` provides. Nextcloud renders an admin page without a `CnAppRoot`, so every formatter id there resolved to nothing and the raw value showed: DqInstellingen "Laatste contact" read `2026-09-29T18:23:47+00:00` where the board draws "Vandaag 09:12".

`CnAdminSettingsShell` now provides `cnFormatters`: the library's built-in formatters, then an ancestor's registry when there is one, then its own new `formatters` prop, so an app can hand its admin page the same formatters its `CnAppRoot` gets.

## Scope

- `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`, docs.
- No schema change.
