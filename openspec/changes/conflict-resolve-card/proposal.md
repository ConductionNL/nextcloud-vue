---
kind: code
---

# Proposal: conflict-resolve-card

## Summary

Board DqInspectie, the sync frame, draws a card under the outbox: "Conflict: welke tekst houdt u?", the text on this device and the text at the office, and two buttons, "Deze houden" and "Die van kantoor". The library has the device-side half of this (CnOfflineQueue's Keep mine / Keep theirs over IndexedDB), but no widget that shows a conflict record from the register and settles it there. CnConflictResolveCard is that card as a dashboard widget, `conflict-resolve`, configured from the manifest. It is generic: any app that files conflict records with two snapshots can use it (an offline checklist, a form edited in two places, an import that met a newer record).

## Scope

- New `src/components/CnConflictResolveCard/` (registered as `conflict-resolve`, exported), `src/utils/conflictFields.js`, catalog key in `libraryWidgetKeys.js`.
- Library strings in `l10n/en.json` and `l10n/nl.json`.
- Docs page `docs/components/cn-conflict-resolve-card.md`.
- No schema change: widget `content` stays free-form for this type.

## Out of scope

- The server side. The widget posts the choice to an endpoint the app names; writing the chosen value and marking the record resolved is the app's work (dossiq: SIG's contract in the dossiq change `inspection-conflict-card`).
- A manual merge (a third button with an edited value). The board draws two buttons.
- Filing conflicts from the device into the register (`recordConflict` with `conflictSchema`) is unchanged.
