---
kind: code
---

# Proposal: app-shown-name-in-chrome

## Summary

dossiq passes no `appDisplayName` and its manifest has no `name`, so CnAppRoot handed the id to the user settings dialog ("Instellingen · dossiq"), the setup wizard and the credentials section. CnAppRoot now hands them `shownAppName`: the given name through the app's translate, else Nextcloud's localised app menu name, else the id with a capital (the existing `appShownName` util).

NcContent's `appName` keeps its binding, because it also keys the stored list-pane width (`pane-list-size-<appName>`). Translating it would reset every reader's pane width on a language switch.

The user settings dialog's navigation links lost their underline under a theme that underlines `a` with `!important` (thematiq). They now carry `text-decoration: none !important`.

## Scope

- `src/components/CnAppRoot/CnAppRoot.vue`: `shownAppName`, used for the dialog, the setup wizard and the credentials section.
- `src/components/CnUserSettingsDialog/CnUserSettingsDialog.vue`: the nav link underline.
- No schema change.
