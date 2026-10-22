# widgetSelection

`src/utils/widgetSelection.js`: the row selection a detail page shares between a list and a card that follows it (side-card-follows-row).

- `createWidgetSelection()` returns a store with three methods:
  - `entry(widgetId)` gives `{ rows, selected }`;
  - `publishRows(widgetId, rows)` keeps the selection only while its row is still listed;
  - `select(widgetId, row)` sets the selected row.
- `followedRow(entry, follows)` returns the row a following card shows. That is the selected row when `follows.when` holds for it, else, while nothing is selected, the first row for which it holds, else null.
- `WIDGET_SELECTION` (`cnWidgetSelection`) is the key under which CnDetailPage provides the store. `HOST_WIDGET_ID` (`cnHostWidgetId`) is the key under which CnDetailWidgetHost provides its widget's id.
