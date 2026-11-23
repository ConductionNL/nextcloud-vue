---
kind: code
---

# Proposal: task-form-widget

## Summary

Board DqTaak draws the flow task's question as a card of its own ("Vraag uit de flow"): the question, a text area, a date and a choice, a required field refused under it ("Afronden is geweigerd: vul Verslag van de hoorzitting in."), a help line, and "Opslaan als voorlopig" plus "Afronden"; a draft from a previous visit comes back with a notice. The task form was drawn only inside the task table or the focus card, as one-line text fields.

## Scope

- New `src/components/CnTaskFormWidget/` (widget type `task-form`, registered, exported), `src/components/CnTaskFormFields/CnTaskFormFields.vue` (field kinds and `errors`), registry lists, l10n en + nl (7 strings), docs, `tests/components/CnTaskFormWidget.spec.js`.

## Out of scope

- The draft route itself (dossiq#4870) and the app's manifest.
