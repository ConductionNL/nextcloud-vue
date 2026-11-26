---
kind: code
---

# Proposal: admin-shell-sub-tabs

## Summary

The board PqBeheerPortaal draws a tab strip "Portalen 3 | Auditlog 1284". In pipelinq that page is one tab (Klantportaal) of the admin settings shell, so it needs a second strip inside a shell tab's panel. Apps could nest a `CnTabs` themselves, but then each app solves the address, the look and lazy mounting again.

A shell tab may now carry `tabs: [{ id, label, count? }]`. The shell draws that strip in the tab's panel, under the `tab-<id>` slot, in the same look and variant as the main strip; each inner panel is the `tab-<id>-<subId>` slot. The open inner tab goes in the address (`subTabQueryKey`, default `subtab`), a link or reload opens it, `lazyTabs` mounts only the open inner panel, and `sub-tab-change` reports a switch.

## Scope

- `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`, docs.
- No schema change.
