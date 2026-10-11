# dutch-user-settings-dialog Delta

## Purpose

A Dutch reader meets the user settings dialog, its default sections and the
navigation entry that opens it in Dutch, worded as the drawn boards word them.

## ADDED Requirements

### Requirement: The user settings dialog reads Dutch for a Dutch reader

The library's Dutch catalogue SHALL translate the dialog title "User settings"
as "Persoonlijke instellingen", "Personal settings" as "Persoonlijke
instellingen", "Credentials" as "Inloggegevens", "Notifications" as
"Meldingen" and "Walkthrough" as "Rondleiding", together with every string
`CnNotificationPreferences`, `CnCredentials` and `CnAppNav` pass to `t`.
`CnAppRoot` SHALL take the copy of the dialog parts it draws itself (the
title, the credentials section name, the walkthrough section name, hint and
restart label, the integrations hint) from the library catalogue first, and
only fall back to the app's `translate` when the library has no translation
in the user's language.

#### Scenario: The dialog for a Dutch reader of an app that gives "Credentials" another meaning

- **GIVEN** the user's language is Dutch
- **AND** the app's `translate` answers "Diploma's" for "Credentials"
- **WHEN** the user settings dialog opens
- **THEN** its title reads "Persoonlijke instellingen"
- **AND** the credentials section reads "Inloggegevens" and the walkthrough section "Rondleiding"
- @e2e exclude the strings come from the catalogue, which `tests/l10n/userSettingsDutch.spec.js` reads through the real @nextcloud/l10n; the e2e harness shims `t` and cannot see a translation

#### Scenario: An English reader keeps the app's own wording

- **GIVEN** the user's language is English, where the library has no translation of its own
- **WHEN** the dialog asks for the "Credentials" section name
- **THEN** the app's `translate` answers
- @e2e exclude a pure lookup order, covered by `tests/l10n/userSettingsDutch.spec.js`
