# CnTaskFormWidget

The form of the flow task a detail page shows, as a card of its own, as board DqTaak draws "Vraag uit de flow": the question, the fields, a help line, and the buttons Save as provisional and Complete. Widget type `task-form`. The task is the page's record (`objectData`); the detail host draws the titled card around it.

```json
{
  "id": "task-question",
  "type": "task-form",
  "title": "Question from the flow",
  "content": {
    "help": "Your answer goes to the next step of the case.",
    "completeUrl": "/apps/dossiq/api/tasks/{id}/complete",
    "draft": { "url": "/apps/dossiq/api/tasks/{id}/draft" }
  }
}
```

## Content

| Key | Default | Meaning |
|-----|---------|---------|
| `description` | the task form's `description` | The question above the fields, a template filled from the task. |
| `help` | | A muted line under the fields. |
| `completeUrl` | the engine's flow-task route | Where Complete posts `{ outcome: "done", data }`. `{id}` is the task uuid. |
| `draft` | | `{ url, method? }`. A GET on mount answers `{ values, savedAt }` (a kept draft); Save as provisional sends `{ values }` (`method`, POST by default). `{id}` is the task uuid. Without it there is no draft button and no read. |
| `draftLabel`, `completeLabel`, `successMessage`, `draftSavedText`, `emptyText` | Save as provisional, Complete, Task completed., Saved as provisional., This task asks nothing to fill in. | Texts, through the host translate. |
| `restoredText` | Unsaved input restored: {count} of {total} fields from your previous visit, {date}. Check them and save. | The status notice when a draft comes back. |

Complete checks the required fields first. A required field left empty gets "Completing was refused: fill in {field}." under it and nothing is sent. A completed task shows `successMessage` and emits `cn:page:refresh`. A refusal stays in the card as an alert in the server's words ([card notices](./cn-card-notices.md)). The fields are drawn by [CnTaskFormFields](./cn-task-form-fields.md): a text area, a date, a choice, or one line of text.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | Object | `{}` | See above. |
| `objectData` | Object | `null` | The page's record: the flow task. |
| `objectId` | String \| Number | `null` | The record id, used when the task carries no uuid. |
