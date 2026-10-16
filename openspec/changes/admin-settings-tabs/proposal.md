---
kind: code
---

# Proposal: admin-settings-tabs

## Summary

The admin boards ShInstellingen and LpBeheerAlgemeen draw a tab strip under the header ("Algemeen", "Verplichte velden 12", "Koppelingen 5", ...). CnAdminSettingsShell had no strip, so an app had to build its own or put every section on one page.

`CnAdminSettingsShell` takes `tabs: [{ id, label, count? }]`. It draws them with `CnTabs` (the board folder strip under the board look) right under the header. Each tab's panel is the `tab-<id>` slot. The version card, the credential broker and the default slot belong to the first tab. The open tab is in the address (`?tab=<id>`, key set by `tabQueryKey`): a link opens it and a reload keeps it. The address entry is replaced, not added, so Back leaves the page. Arrow keys, Home and End move between tabs (the WAI-ARIA tabs pattern CnTabs already implements). Under the board look a panel's sections are cards on the same grid as the shell's own.

## Scope

- `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`: `tabs`, `tabQueryKey`, `tab-<id>` slots, `tab-change` event.
- `src/css/look-board.css`: the panel takes the shell's grid and card rules.
- Without `tabs` the shell is unchanged. No manifest schema change (the shell is configured by props).
- Not built: LpBeheerAlgemeen draws an underline strip, ShInstellingen folder tabs. The shell uses CnTabs' board strip (folder tabs) for both.
