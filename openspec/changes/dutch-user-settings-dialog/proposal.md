---
kind: code
---

# Proposal: dutch-user-settings-dialog

## Summary

The user settings dialog that `CnAppRoot` hosts reached a Dutch reader partly
in English. Its title ("User settings"), the credentials section, the
walkthrough section and its hint went through the app's `translate` only, and
no app catalogue carried them, so they stayed English. Where an app catalogue
did carry the word it could mean something else: learniq translates
"Credentials" as "Diploma's" for its own records, and the vault pane in its
dialog carried that name. The default sections themselves (the notifications
pane and the credentials pane) and the navigation's "Personal settings" entry
had no Dutch in the library catalogue either.

The drawn dialog boards (NcAppInstellingen and every `*PersoonlijkeInstellingen`
board in design-system) name the dialog "Persoonlijke instellingen" and its
sections "Meldingen", "Inloggegevens" and "Rondleiding" (Ruben's decision,
11 October 2026).

## What changes

1. `l10n/nl.json` gains Dutch for the dialog's title and section names, the
   walkthrough hint and restart label, the integrations hint, the navigation's
   "Personal settings", "Admin settings" and "Main navigation", and every
   string of `CnNotificationPreferences` and `CnCredentials`.
2. `CnAppRoot` reads the copy of the parts it draws itself through a new
   `libraryCopy(key)`: the library catalogue first, then the app's
   `translate`, then the text as written. An app still renames the dialog
   with `userSettingsTitle`. "Integrations" keeps going through the app's
   `translate`, because apps name that section on purpose ("Koppelingen" or
   "Integraties").
