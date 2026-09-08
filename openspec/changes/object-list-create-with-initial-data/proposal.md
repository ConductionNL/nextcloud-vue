---
kind: code
---

# Proposal: object-list-create-with-initial-data

## Summary

When a user clicks "+ Add" on a `CnObjectListWidget`, the create form opens
with the widget's register and its resolved filter as initial data. A task
list filtered to the current case creates a task already on that case; a
participants list creates a role already on the case.

Opened from the dossiq competitor analysis, round 2, placement section 3
(`concurrentie-analyse/procest/_round2/compare/placement.md`) for findings
A03, A17 and A27, and defect triage #6
(`concurrentie-analyse/procest/_round2/compare/dossiq-defect-triage.md`).
Decision D10 (Ruben, 2026-09-08): proposal now, implementation separate.

## Motivation

On dossiq's CaseDetail, the Tasks tab "+ Add" opens Create Task where Case is
a plain text field, not prefilled, and Create stays disabled until a uuid is
pasted (triage #6). The widget mounts `CnFormDialog` with `:schema` only: no
`register`, so the `$ref: case` picker degrades to a text box, and no
`initialData`, so the required `case` stays empty. The filter is merged after
confirm, too late for the required check.

Every competitor adds a child from the parent's context:

- OpenCase: Add citizen and Add company on the Participants tab
  (`opencase/round2/pages/CaseDetail-Participants.md`).
- xxllnc Zaaksysteem: "Voeg toe" on Betrokkenen and on Gerelateerde objecten
  (`xxllnc-zaken/round2/pages/Case-Relaties.md`), a contact moment dialog on
  the case (`xxllnc-zaken/round2/pages/Contactmoment-dialog.md`).

This is the library half that A03 (participants), A17 (contact moments) and
A27 (linked objects) all need before they can be config on the dossiq side.

## Affected projects

- `nextcloud-vue`: `CnObjectListWidget`, `CnRelatedCollections`, the
  `cn-workspace-context-widgets` capability.
- Consumers: every object-list "+ Add" in the fleet. dossiq case tabs first.

## Backward compatibility

Behaviour changes only where the form was unusable. A widget with no filter
opens the same empty form. A widget whose filter names a non-schema key
ignores that key for initial data.

## Theming

None.
