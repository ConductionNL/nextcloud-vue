---
kind: code
---

# Proposal: admin-shell-provides-its-look

## Summary

On an admin settings page Nextcloud mounts the app's component without a CnAppRoot, so no `cnLook` is provided. CnAdminSettingsShell told `look: "board"` drew its own frame, header and cards in the board look, but its own CnVersionInfoCard resolves its look from the `cnLook` injection and drew the Nextcloud look. larpinq had to `app.provide('cnLook', 'board')` to fix this (board LrBeheerinstellingen).

The shell now provides the look it resolved (its own `look`, else the injected `cnLook`) as `cnLook`. Its version card, and every component in the app's sections that follows `cnLook`, draws in the shell's look without the app providing it. Without the key nothing changes: the shell provides `nextcloud`, as before.

## Scope

- `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`: `provide('cnLook', look)` in `setup`.
- No schema change.
