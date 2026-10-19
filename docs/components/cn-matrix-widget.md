# CnMatrixWidget

A categorical grid: row headers, column headers, a short text in every cell with a tone, and the cell that applies to the record outlined. Board DqHandhaving draws the national enforcement strategy this way: behaviour by consequence, the advised measure in each cell. Registered under the `matrix` type for detail pages; place it from the manifest (there is no config form yet).

## Manifest

```json
{
  "id": "enforcement-matrix",
  "type": "matrix",
  "title": "Advice under the national enforcement strategy",
  "content": {
    "subtitle": "The chosen cell is outlined",
    "rowField": "behaviour",
    "columnField": "consequence",
    "columns": [
      { "value": "A", "label": "Consequence A: minor" },
      { "value": "B", "label": "Consequence B: moderate" }
    ],
    "rows": [
      { "value": "1", "label": "Behaviour 1: willing", "cells": ["Talk", "Warning"] },
      { "value": "2", "label": "Behaviour 2: unaware", "cells": { "A": "Warning", "B": { "text": "Penalty payment", "tone": "error" } } }
    ],
    "tones": { "Talk": "success", "Warning": "warning" }
  }
}
```

## Content

| Key | Description |
|---|---|
| `columns` | `[{ value, label }]`, the column headers. |
| `rows` | `[{ value, label, cells }]`. `cells` is an array in column order, or a map keyed by column value. A cell is its text, or `{ text, tone }`. |
| `tones` | Cell text to tone, for cells that name none: `success`, `warning`, `error`, `error-strong`, `info` or `neutral`. Tones are theme colours, so an NL Design System theme recolours them. |
| `rowField`, `columnField` | The record fields whose values pick the chosen cell. |
| `selected` | `{ row, column }`: a fixed chosen cell instead. |
| `subtitle` | A line above the grid. |
| `title` | The table's accessible name when the widget card shows none; defaults to "Matrix". |

Labels and cell texts go through the app's translate. The grid is a real table: column and row headers carry `scope`, and the chosen cell has `aria-current="true"` and says "(chosen)" to a screen reader, since the outline alone reaches no one who cannot see it.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The axes, cells, tones and how the chosen cell is picked (see above). |
| `objectData` | `object` | `null` | The bound record, read by `rowField` and `columnField`. |

## Reference (auto-generated)

import GeneratedRef from './_generated/CnMatrixWidget.md'

<GeneratedRef />
