# CnStatGridWidget

The `stat-grid` widget: several figures in a grid inside one card. Board DqDagAfsluiten draws "Uw dag" this way: Geopend, Vastgelegd, Uren and Klaar te zetten, two to a row, each a label, a large figure and a line under it.

- Each cell is a [`stat`](./cn-stat-widget.md) drawn flat and stacked: `label`, `valueField`, `caption`, `format` and the other stat keys.
- The cells read the grid's `endpointSource`. A cell that names its own `endpointSource` reads that instead, so one figure can come from another app (the hours from humaniq beside dossiq's own counts).
- A cell with `visibleWhen` (the shared condition, `appInstalled` included) shows only once the condition holds. A condition that fails, or cannot be read, hides the cell; the other cells stay.

## Usage

```json
{
  "id": "eod-figures",
  "type": "stat-grid",
  "title": "Your day",
  "content": {
    "columns": 2,
    "endpointSource": { "url": "/apps/dossiq/api/personal-queue/end-of-day" },
    "cells": [
      { "label": "Opened", "valueField": "figures.0.value", "caption": "{figures.0.note}" },
      { "label": "Notes recorded", "valueField": "figures.1.value", "caption": "{figures.1.note}" },
      {
        "label": "Hours",
        "valueField": "hours",
        "caption": "already in humaniq",
        "format": { "style": "decimal", "decimals": 2 },
        "endpointSource": { "url": "/apps/humaniq/api/time-entries/summary" },
        "visibleWhen": { "appInstalled": "humaniq" }
      }
    ]
  }
}
```

## Content

| Key | Type | Description |
|-----|------|-------------|
| `columns` | Number | Cells to a row, 1 to 4; 2 by default. |
| `endpointSource` | Object | The endpoint the cells read unless they name their own (`url`, `params?`, `responsePath?`). |
| `cells` | Array | The figures, in order. Each is a stat's content plus `endpointSource?` and `visibleWhen?`. |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | Object | `{}` | The grid, see Content. |
