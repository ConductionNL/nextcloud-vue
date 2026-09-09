---
kind: code
---

# Proposal: write-feedback-toast-and-undo

## Summary

Every write the library performs tells the user it landed. `CnFormDialog`,
`CnLifecycleActions` and `CnObjectListWidget` show a success toast after a
save, a transition or a delete. A destructive transition asks first. A delete
and a transition offer Undo in the toast for a short window.

Opened from the dossiq competitor analysis, round 2, Tier B row B16
(`concurrentie-analyse/procest/_round2/compare/tier-b-and-sibling.md`), and
placement rows A06 and A21. Decision D10 (Ruben, 2026-09-08): proposal now,
implementation separate.

## Motivation

In dossiq, Save closes the dialog and nothing else happens. Pick up and
Complete on a task move it with no confirmation and no way back
(`_round2/dossiq-baseline/usability.md`, recoverability 1;
`_round2/dossiq-baseline/journeys.md` J5). All three competitors do better:

- OpenCase toasts "Case created" after J2 (`opencase/round2/journeys.md`).
- Valtimo GZAC toasts after completing a task in J5
  (`valtimo/round2/journeys.md`).
- xxllnc Zaaksysteem shows an autosave indicator, undo routes and a timeline
  (`xxllnc-zaken/round2/usability.md`, recoverability).

`CnLifecycleActions` already accepts `confirm` on a config-declared
transition. This change makes feedback the default, not a per-transition
option an app forgets.

## Affected projects

- `nextcloud-vue`: `CnFormDialog`, `CnLifecycleActions`, `CnObjectListWidget`,
  a `useWriteFeedback` helper over `@nextcloud/dialogs` `showSuccess`,
  `showError` and `showUndo`.
- Consumers: all five, and every fleet app rendered through the manifest.
  dossiq CaseDetail, TaskDetail and the case panels benefit first.

## Backward compatibility

Toasts are on by default. An app that renders its own feedback sets
`feedback: false` on the dialog, the action config or the widget content to
keep one message. Confirmation on a destructive transition is on by default
for `variant: danger` or a transition into a final state; `confirm: false`
turns it off. Undo is offered only where the library can reverse the write:
a delete restores through the OpenRegister trash, a transition posts the
reverse transition when the graph allows it.

## Theming

`@nextcloud/dialogs` toasts, no custom colours.
