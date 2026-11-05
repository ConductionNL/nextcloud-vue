# task-form-widget Delta: task-form-widget

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [task-form-widget](../../)

## ADDED Requirements

### Requirement: A flow task's form is a card of its own

The widget type `task-form` SHALL draw the form of the page's record (a flow task): the question (`content.description`, a template filled from the task, else the form's `description`), the fields through CnTaskFormFields, the `help` line, and a primary Complete button (`completeLabel`). Complete SHALL first check the required fields and, for each one left empty, put "Completing was refused: fill in {field}." under it and send nothing; otherwise it SHALL POST `{ outcome: "done", data }` to `completeUrl` (`{id}` the task uuid; default the engine's flow-task route), show `successMessage` and emit `cn:page:refresh`. A refusal SHALL stay in the card as an alert in the server's words.

### Requirement: A task form can be saved as provisional and comes back

With `content.draft: { url, method? }` the widget SHALL offer "Save as provisional" (`draftLabel`), sending `{ values }` with the required fields allowed empty, and SHALL read the draft on mount: when it answers `{ values, savedAt }` with answers, they SHALL be put back and a status notice (`restoredText`, default "Unsaved input restored: {count} of {total} fields from your previous visit, {date}. Check them and save.") SHALL say how many came back and when. Without `draft` there SHALL be no draft button and no read.

### Requirement: A task form field can be a text area, a date or a choice

CnTaskFormFields SHALL draw a field with `widget` or `type` `textarea` as a text area, `date` as a date input, and a field with `options` (`[{ value, label }]` or strings) or `enum` (or `select`) as a choice; any other field stays one line of text. It SHALL take `errors` (`{ field: message }`) and draw a field's message under it.
