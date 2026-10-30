# record-notes-actions Delta: record-notes-widget

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-notes-actions](../../)

## ADDED Requirements

### Requirement: A notes field can send its text with an action

CnRecordNotesWidget SHALL draw `content.actions` as buttons under the text, `variant: "primary"` filled and any other outlined, each with its `icon`. A button SHALL be disabled while the text is empty or an action runs. Clicking SHALL send `request.body` to `request.url` (tokens resolved, default POST), with `{text}` in a body value replaced by the typed text. On success the text SHALL clear, the status line SHALL read the action's `doneText` and the page SHALL refresh; on a refusal the status line SHALL show the server's message and the text SHALL stay. With `autosave: false` the text SHALL not be written to the record as it is typed.

#### Scenario: Finishing a callback task

- **GIVEN** the task's card "Deze taak afronden" with `autosave: false` and the actions "Poging vastleggen" (`/apps/pipelinq/api/callbacks/@objectId/attempts`, body `{ result: "{text}" }`) and "Afronden" (`.../complete`, body `{ resultText: "{text}" }`)
- **WHEN** the agent writes "Afvalpas opnieuw aangemeld" and clicks Afronden
- **THEN** the widget posts `{ resultText: "Afvalpas opnieuw aangemeld" }` to the task's complete route, writes nothing while typing, and the page refreshes

#### Scenario: The server refuses

- **GIVEN** the same card
- **WHEN** the complete route answers 403 "You are not assigned to this task"
- **THEN** the card shows that sentence and keeps the text
