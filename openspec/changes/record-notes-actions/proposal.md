---
kind: code
---

# Proposal: record-notes-actions

## Summary

Board PqTaak draws a card "Deze taak afronden" between the task and its documents: a Resultaat text area ("Wat kwam er uit het terugbellen?"), an outlined "Poging vastleggen" and a primary "Afronden". Both buttons send the typed text to an endpoint of the app: an attempt goes on the task's attempt log, finishing closes the task with the text as its result. The app's endpoints check that the user may act on the task.

CnRecordNotesWidget is the text field of the record in view. It learns `actions`: buttons under the text, each sending the text to an endpoint (`request: { url, method?, body }`, `{text}` in a body value is the typed text, `@objectId` and `@object.<field>` tokens in the url), and `autosave: false`, so a text that only travels with an action is not also written to the record as you type. After an action the text clears, the status line says the action's `doneText`, and the page refreshes; a refusal shows in the server's words and the text stays.

## Scope

- `src/components/CnRecordNotesWidget/CnRecordNotesWidget.vue`.
- No schema change (widget content is free-form).
