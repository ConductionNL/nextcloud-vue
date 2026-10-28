# CnRecordNotesWidget

The `record-notes` widget: a text field of the record in view, edited in place and saved as you type, such as the conversation notes on a contact moment. An optional select writes a second field, for example the outcome, with its own button.

```json
{
  "id": "notes",
  "type": "record-notes",
  "title": "Notes",
  "content": {
    "field": "notes",
    "rows": 8,
    "savedText": "Saved {time}",
    "outcome": {
      "field": "outcome",
      "label": "Outcome",
      "options": [{ "value": "resolved", "label": "Resolved" }, { "value": "callback", "label": "Call back" }]
    }
  }
}
```

A save is a PATCH of only the edited key on the record's OpenRegister object, so a change somebody else made to another key stays. `field` defaults to `notes`, and `savedText` takes `{time}`, the time of the last save. When a save fails the text stays in the field and is saved again on the next keystroke. Without a record id, register and schema the fields are read-only.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | `{ field?, label?, rows?, placeholder?, savedText?, savingText?, failedText?, debounceMs?, outcome?: { field, label?, placeholder?, saveLabel?, options } }`. |
| `objectData` | `object` | `null` | The record in view, as the detail page hands it to a widget. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `saved` | `{ changes, object }` | Emitted after the record took the change. |
