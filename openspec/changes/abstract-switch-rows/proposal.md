---
kind: code
---

# Proposal: abstract-switch-rows

## Summary

Ruben, 11 Oct 2026: pages are manifest configuration over abstract widgets. PtPortalInstellingen draws "Verkeer meten",
"Berichtenbox van MijnOverheid" and "Als app installeren" as a card with a switch, a bold label and a hint; ShInstellingen
("Verplichte velden") and LpBeheerAlgemeen ("Persoonlijke dashboards toestaan") draw the same rows. The `switch-rows`
widget (CnSwitchRowsWidget) binds each row to a boolean field of the current object and saves a toggle at once with one
PATCH of that field.

Existing widgets were checked first: `settings-form` has a switch type but saves on a Save button with other fields; a
board card of switches has no Save button. A separate small widget keeps both honest.

## Scope

New widget, docs, unit tests, harness e2e. No schema change. Stacked on settings-form (#1515): reuses `objectWrite.js`
and `SettingsWidgetsHarness.vue`.

## Out of scope

A switch that opens extra fields below it (the traffic card's selects): that is a `settings-form` in the same card.
