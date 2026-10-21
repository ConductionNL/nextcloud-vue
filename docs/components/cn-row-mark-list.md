# CnRowMarkList

Every row of a list gets one of a few marks (present, late, absent; attended, excused; yes, no, abstain), with details per mark, and the whole list is saved in one request. Registered under the `row-mark-list` widget type. A school register, a meeting's attendance and quorum list and a team's presence list are this shape.

## Content shape

```json
{
  "id": "register",
  "type": "row-mark-list",
  "title": "Attendance register",
  "content": {
    "load": { "url": "/apps/learniq/api/attendance/roll-call" },
    "save": { "url": "/apps/learniq/api/attendance/roll-call", "body": { "cohortId": "cohortId", "date": "date", "sessionId": "sessionId" }, "rowsKey": "marks" },
    "rowsPath": "pupils",
    "rowKey": "learnerId",
    "labelField": "name",
    "stateField": "status",
    "defaultState": "present",
    "editablePath": "editable",
    "states": [
      { "value": "present", "label": "Present", "key": "P", "countLabel": "{n} present" },
      { "value": "late", "label": "Late", "key": "L", "countLabel": "{n} late" }
    ],
    "detailFields": [
      { "field": "lateMinutes", "label": "Minutes late", "type": "number", "states": ["late"], "quick": [5, 10, 15], "min": 1, "max": 600, "required": true, "default": 5 },
      { "field": "reason", "label": "Note (optional)", "type": "text", "notStates": ["present"], "maxlength": 500 }
    ],
    "badges": [{ "path": "markedVia", "equals": "self-check-in", "text": "checked in" }],
    "controls": [
      { "param": "cohortId", "type": "select", "label": "Group", "optionsPath": "cohorts", "optionValue": "id", "optionLabel": "name", "valuePath": "cohortId", "resets": ["sessionId"] },
      { "param": "date", "type": "date", "label": "Day", "valuePath": "date", "maxPath": "today", "todayPath": "today", "resets": ["sessionId"] }
    ],
    "notices": [{ "path": "locked", "equals": "past-saved", "type": "info", "text": "This day's register is saved." }]
  }
}
```

| Key | Meaning |
|-----|---------|
| `load` | `{ url, params? }`. A GET whose answer holds the rows and anything the controls, notices and save read. Every control's value is added as a query parameter. |
| `save` | `{ url, method?, body?, rowsKey? }`. One request (default `POST`). `body` maps each body key to a path in the loaded answer; the rows go under `rowsKey` (default `rows`). The answer is shown as the new list. |
| `rowsPath`, `rowKey`, `labelField`, `stateField` | Where the rows are in the answer, and each row's key, label and mark. |
| `states` | `[{ value, label, key?, countLabel? }]`. `key` marks a focused row; it is translated like a label, so each language can choose its own letter. `countLabel` carries `{n}` for the counts line. |
| `defaultState` | The mark of a row that has none (default: the first state). |
| `detailFields` | `[{ field, label, type, states?, notStates?, quick?, min?, max?, otherLabel?, options?, maxlength?, required?, default? }]`. `type` is `number` (quick picks plus a number input), `select` (`options: [{ value, label }]`) or `text`. A field shows only for `states` (or for every mark but `notStates`), takes its `default` when a row takes such a mark, and is cleared when it leaves. A `required` field is checked before the save. |
| `badges` | `[{ path, equals?, notEquals?, missing?, text }]`. A line under the row's label when the rule holds on the row (see Rules). `{a.b}` in `text` reads the row. |
| `controls` | `[{ param, type: "select" or "date", label, valuePath, optionsPath?, optionValue?, optionLabel?, maxPath?, todayPath?, resets? }]`. Choices that scope the list. A change goes into the page's query (so a link can open the list on it) and loads the list again; `resets` names parameters it clears. A select with one option or none is not drawn. |
| `notices` | `[{ path, equals?, notEquals?, missing?, type?, text }]`. A note above the list when the rule holds on the answer (see Rules). |
| `heading`, `headingPath` | A heading above the list, followed by the answer's value at `headingPath` ("Attendance register · 1A"). |
| `editablePath` | A boolean in the answer. When it is not true, the marks and the save are disabled. Without it the list is editable. |
| `emptyText`, `saveLabel`, `savedText`, `incompleteText`, `loadErrorText`, `saveErrorText`, `rowLabel` | Texts; `incompleteText` carries `{names}`, `rowLabel` `{name}` and `{state}`. A server refusal shows the server's own words. |

## Rules

A badge or a notice holds when the value at `path` equals `equals`; else, with `notEquals`, when a value is there and differs from it; else, with `missing: true`, when there is no value (absent, empty, or an empty list); else when there is a value.

## Keyboard

A row is focusable and its name for a screen reader is the label, the mark and the details that hold a value. The marks' keys mark it, the arrow keys go to the next or previous row, and the hint above the list names the keys in the user's language.

## Events

| Event | Payload | When |
|-------|---------|------|
| `saved` | the save's answer | After a successful save. |
