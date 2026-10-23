# CnSlotGrid

The objects of one schema laid out as a grid: one row per value of the row fields (a time window), one column per value of the column field (a weekday), and the objects of each cell listed in it. A cell has an add button that opens the schema's create form with the cell's values filled in; each item can be removed after a confirm. Registered under the `slot-grid` widget type. Standby hours, shift rosters and on-call grids are this shape.

## Content shape

```json
{
  "id": "standby",
  "type": "slot-grid",
  "title": "Standby hours",
  "content": {
    "source": { "register": "learniq", "schema": "standby-slot" },
    "rowFields": ["startsAt", "endsAt"],
    "rowLabel": "{startsAt} to {endsAt}",
    "rowHeader": "Time",
    "columnField": "weekday",
    "columns": [{ "value": "monday", "label": "Monday" }, { "value": "tuesday", "label": "Tuesday" }],
    "skipWhenField": "date",
    "itemLabelField": "teacherId",
    "itemLabelKind": "user",
    "cellAction": { "label": "Add standby on {column} at {startsAt}" },
    "addAction": { "label": "Add standby" },
    "removeAction": { "label": "Remove {item} from standby" },
    "emptyText": "No standby hours yet",
    "caption": "Teachers on standby per weekday and time"
  }
}
```

| Key | Meaning |
|-----|---------|
| `source` | `{ register, schema, filter? }`. Every object is read, page by page, so no cap hides one. |
| `rowFields` | The fields whose values make a row; rows sort by them. |
| `rowLabel`, `rowHeader` | The row's header, with `{field}` placeholders from `rowFields`, and the name of the header column. |
| `columnField`, `columns` | The field that picks the column, and the columns `[{ value, label }]` in their order. An object whose value is not a column is left out. |
| `skipWhenField` | Objects holding a value in this field are left out (a one-off date in a weekly grid). |
| `itemLabelField`, `itemLabelKind` | What an item shows; `user` shows the Nextcloud user's display name, not the user id. |
| `cellAction` | `{ label, includeFields?, excludeFields?, fieldOverrides? }`. The add button in every cell, named by `label` (`{column}` and the row fields); it opens the source schema's create form (CnActionButtons `open-form`) with the cell's row and column values filled in. |
| `addAction` | `{ label, props? }`. One add button above the grid, without cell values. |
| `removeAction` | `{ label, title?, message? }`. A remove button per item, named by `label` (`{item}`), that deletes the object after a confirm (`message`, `{item}`). |
| `emptyText`, `caption` | The text without items, and the table's caption for screen readers. |

The grid is read again after a create and after a remove.
