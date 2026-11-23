# Proposal: admin-shell-registers-catalogue

## Why

An admin settings page is its own webpack entry. The library's strings only read in the user's language after the app
calls `registerTranslations()`, and five apps' admin entries never did, so their version card and admin chrome read
English for a Dutch user ("Application name", "Up to date", "Support"). Each app fixed its own entry in the 2.85.0
bump; the next app to add an admin page would miss it again.

## What changes

- `ensureTranslations()` in `src/l10n/index.js`: registers the catalogue unless this page already did.
- CnAdminSettingsShell and CnVersionInfoCard call it in `setup()`, so an admin page reads in the user's language
  whether or not its entry registered the catalogue. An app that already calls `registerTranslations()` is unaffected.
