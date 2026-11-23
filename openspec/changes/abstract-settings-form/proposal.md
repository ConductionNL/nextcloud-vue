---
kind: code
---

# Proposal: abstract-settings-form

## Summary

Ruben, 11 Oct 2026: pages are manifest configuration over abstract widgets. Settings-style pages are still app
components because the library has no widget for "fields of the current object, saved with a PATCH". The same shape
appears on PtPortalInstellingen ("Gegevens van de portal"), PqBeheerPortaal (Naam, Domein, Hoofdkleur, Logo),
ShInstellingen and LpBeheerAlgemeen (Standaardinstellingen: select, switches, numbers with a hint). portaliq's
`PortalDetailsForm` is the app component this replaces.

The `settings-form` widget (CnSettingsFormWidget) draws the configured fields of the current object in a one- or
two-column grid of framed inputs with light labels and hints, and saves ONE PATCH with the fields that changed since
the last save. Field types: text, textarea, select, switch, number.

## Scope

New widget, docs, unit tests, harness e2e (`SettingsWidgetsHarness`, shared by the sibling settings widgets). New util
`objectWrite.js` (object URL, PATCH, changed fields). No schema change: `content` is free-form.

Existing widgets were checked first. `facts` and `field-list` only read or edit a list; CnDetailGrid edits nothing on
its own; `workspace-filter` is a filter. None writes a set of scalar fields of the current object.

## Out of scope

Chips, radio cards, switch rows, toggle tables and theme pickers (sibling changes). Migrating portaliq (see
apply-portaliq-instellingen.md).
