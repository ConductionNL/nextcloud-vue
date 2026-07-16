# CnTextTableEditor

In-place visual table editor used by the text widget form when `tableMode === true`. Cells are edited directly in the grid (one `<input type="text">` per cell); row / column / merge operations live in a toolbar above the grid.

The editor is **controlled**: the parent owns the `tableData` state via `v-model` (the `value` prop + `input` event) and receives a fresh, validated copy on every change. Selection is single-cell by default; Shift+Click extends the selection to a rectangular region so the user can merge cells. The Merge / Split / Delete buttons enable/disable themselves based on the current selection.

## Usage

```vue
<template>
  <CnTextTableEditor v-model="tableData" />
</template>

<script>
import { CnTextTableEditor } from '@conduction/nextcloud-vue'

export default {
  components: { CnTextTableEditor },
  data() {
    return {
      tableData: {
        headerRow: true,
        columnAlignments: ['left', 'left'],
        rows: [[{ text: 'A', rowSpan: 1, colSpan: 1 }, { text: 'B', rowSpan: 1, colSpan: 1 }]],
      },
    }
  },
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `{ headerRow, columnAlignments, rows }` | `emptyTable()` | The current `tableData` object — the `v-model` value. `rows` is a 2-D array of `{ text, rowSpan, colSpan }` cells. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `input` | `tableData` (object) | `v-model` update; payload is the next validated `tableData` object. |

## Related

- [`CnAddWidgetModal`](./cn-add-widget-modal.md) — Hosts the text widget form that mounts this editor in table mode.
