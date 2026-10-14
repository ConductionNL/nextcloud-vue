---
kind: code
---

# Proposal: screens-admin-settings-version-card-end

## Summary

Board DcBeheer starts the decidiq admin page with the app's own card (Organisatie). CnAdminSettingsShell always draws
its version card (version, re-import, setup wizard, support) above the app's sections, and an app cannot move it: it can
only hide it, which takes away re-import and the setup wizard (decidiq #1729). The shell gets a prop to draw the version
card after the app's sections.

## Scope

- `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`: `versionCardPosition` (`start` default, `end`).
- No manifest key, no schema change. The default keeps every other app as it is.
