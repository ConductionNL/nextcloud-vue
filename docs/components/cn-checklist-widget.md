# CnChecklistWidget

The checklist a record carries, ticked in place on its detail page. It is the `checklist` widget.

- The items are read off the record in view: `content.path`, `checklist` by default. Each item is `{ id, label, description, checked }` unless `content` names other fields.
- A tick is written through the detail page's record source (`cnRecordChecklist`). CnDetailPage provides it when its source can check items, as the `tasks` source does through the task engine.
- The box follows the record the write answers with, so a refused tick leaves the item as it was.
- Without a source that can write, or on a record the source says can no longer be ticked, the list is read-only.
- An item without an id is left out: the write addresses an item by its id, and a box that cannot be saved would look saved.

## Usage

```json
{
  "id": "task-checklist",
  "type": "checklist",
  "title": "Checklist",
  "content": { "path": "checklist", "emptyText": "This task has no checklist." }
}
```

## Content

| Key | Default | Description |
|-----|---------|-------------|
| `path` | `checklist` | Where the items sit on the record |
| `idField` | `id` | An item's id |
| `labelField` | `label` | An item's label |
| `descriptionField` | `description` | A line under the label |
| `checkedField` | `checked` | Whether the item is ticked |
| `emptyText` | | Shown when the record carries no items, through the app's translate |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | Object | `{}` | The configuration above |
| `objectData` | Object | `null` | The record in view, as the detail page hands it to a widget |

## What it reads

| Injection | Description |
|-----------|-------------|
| `cnRecordChecklist` | The record source's checklist writer, provided by CnDetailPage |
| `cnObjectContext` | The detail page's record context |
| `cnTranslate` | The app's translate |
