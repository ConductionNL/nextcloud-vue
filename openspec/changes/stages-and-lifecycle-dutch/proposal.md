# Proposal: stages-and-lifecycle-dutch

## Summary

The stages widget and the lifecycle actions speak Dutch to a Dutch reader. The toast after a move reads "Verplaatst naar Beoordeling", not "Moved to Beoordeling".

## Why

Zuiddrecht live round 3 (14 October 2026): a handler moved a dossiq case and read the toast "Moved to ..." in English. `CnLifecycleActions` and `CnStagesWidget` translate 20 strings in the `nextcloud-vue` domain that `l10n/nl.json` did not carry.

## What changes

- `l10n/nl.json` gets Dutch for every string `CnStagesWidget` and `CnLifecycleActions` translate.
- `tests/l10n/stagesAndLifecycleDutch.spec.js` reads each key from the two components' source, so a string added later without Dutch fails.
