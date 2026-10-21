# CnMatrixWidget

A rows-by-columns grid of objects, drawn and edited from configuration over [`CnDataMatrix`](./cn-data-matrix.md). Registered under the `matrix` widget type.

Use it where an app would otherwise write a grid page by hand: a gradebook (learners by assessment components), open-answer scoring (attempts by items), a review of report cards (cards by subjects, with comments and a transition per row), a coverage matrix (goals by weeks), an hour plan (activities by weeks, stored in one field of the plan), a budget per cost centre per month.

The server decides who may write. A refused write shows the server's own words and the stored value stays.

## Two ways to fill the grid

**Pivot objects.** `rows` and `columns` say what the grid is made of, and `cells` names the objects that go in it: each cell object sits in the row named by its `rowKey` field and the column named by its `columnKey` field, and shows its `value` field.

**One array field of the page object.** `field` names an array on the page object; every entry is a row and its properties are the cells. Each edit re-reads the stored object and sends ONE `PATCH` of that field, so a change someone else made a moment ago is not overwritten.

## Content shape

```json
{
  "type": "matrix",
  "title": "Gradebook",
  "content": {
    "rows": {
      "from": "learnerIds",
      "header": "Learner",
      "lookup": { "register": "school", "schema": "learner-profile", "match": "ncUserId", "label": "{givenName} {familyName}" }
    },
    "columns": {
      "source": { "register": "school", "schema": "curriculum-plan", "id": "@object.planId", "path": "components" },
      "key": "componentId",
      "label": "{name}",
      "type": "number",
      "markBelow": 5.5,
      "markLabel": "Fail"
    },
    "cells": {
      "register": "school",
      "schema": "grade-entry",
      "filter": { "cohortId": "@objectId" },
      "rowKey": "learnerId",
      "columnKey": "componentId",
      "value": "value"
    },
    "write": {
      "cells": {
        "values": { "cohortId": "@objectId", "curriculumPlanId": "@object.planId" },
        "lockedWhen": { "lifecycle": "published" },
        "lockedText": "This mark is published. Revise it on the grade itself."
      }
    },
    "totals": { "columns": true },
    "bulkAction": { "label": "Publish", "transition": "publish", "when": { "lifecycle": "concept" }, "perColumn": true }
  }
}
```

### `rows` and `columns`

| Key | Meaning |
|-----|---------|
| `list` (columns) | A static list: `[{ key, label, type?, readOnly?, markBelow?, markLabel?, aggregate? }]`. |
| `from` | An array field of the page object (`learnerIds`, `components`). |
| `source` | `{ register, schema, filter? }`: every object of that schema, read page by page. With `id` and `path`, an array field of that one object instead. |
| `key` | The id of an object item (default `id`). Scalar items are their own id. |
| `label` | A `{path}` template or a dot-path for an object item. |
| `lookup` (rows) | `{ register, schema, match, label, filter? }`: labels for id items, read from the objects whose `match` field holds the id, in batches. |
| `groupBy` (rows) | A field of an object item; a group row is drawn before each new value. |
| `header` (rows) | The heading of the label column (default "Name"). |
| `type` (columns) | `number` (default), `text` (multi-line, saved on blur) or `string`. |
| `markBelow`, `markLabel` (columns) | A number below `markBelow` is marked, and `markLabel` says so in text. |

### `cells`

`{ register, schema, filter?, rowKey, columnKey, value?, valueMap? }`. `valueMap` maps a stored value to what the cell shows (`{ "covered": "Covered" }`).

### `write`

- `write.cells`: typing in a cell patches its object, or creates one carrying `values`, the row key, the column key and the value. A cell whose object matches `lockedWhen` is not written and shows `lockedText`.
- `write.endpoint`: `{ method?, url, body? }`. The value goes to that endpoint as `{ ...body, row, column, value }`; `{row}` and `{column}` in the URL are filled. A cell object in the answer replaces the stored one; otherwise the grid is read again.

A number column takes a decimal comma or point. Text that is not a number is refused before anything is sent.

### `field`

`{ name, rowKey, label?, valueKey?, groupBy?, header? }`. `valueKey` names a property of each entry that holds the values by column key (`{ "hours": { "w1": 2 } }`); without it the values are properties of the entry.

### `totals` and `norms`

- `totals`: `{ columns?, rows?, label? }` adds a totals row, a totals column, or both.
- `norms`: `{ label?, values? }` with a norm per column key, or `{ from, key?, value? }` to read them from an array field of the page object. A column total above its norm is marked and says "Above the norm".

### `rowActions` and `bulkAction`

- `rowActions`: `[{ id, label, transition, when? }]`. Each runs a lifecycle transition on the row object, when the row is an object and `when` matches.
- `bulkAction`: `{ label, transition, scope?, when?, perColumn? }`. It runs the transition on every cell object (or, with `scope: "rows"`, every row object) that matches `when`, optionally in one chosen column. A confirm names the count first; afterwards the widget reports how many succeeded and lists every refusal with its row, column and the server's reason.

### Other keys

`readOnly`, `hint`, `emptyText`, and `maxRows` (default 5000). Past `maxRows` records the widget shows the first ones and says the grid is not complete, instead of silently showing part of it.

Page tokens (`@objectId`, `@object.<field>`, `@page.<key>`) resolve in every filter, id, value and endpoint body. Nothing is read while a required token has no value yet.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | Object | `{}` | The widget configuration above. |
| `objectData` | Object | `null` | The page object. |
| `objectId` | String \| Number | `''` | The page object's id. |
| `register` | String | `''` | The page object's register, for field-mode saves. |
| `schema` | String | `''` | The page object's schema, for field-mode saves. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `saved` | none | A cell, a field, a row action or the bulk action was saved. |

## Accessibility

Every editable cell is reachable with Tab and opens with Enter or F2; its name says the row, the column and the value. Marks and norms are said in text, not by colour alone. The confirm and the report are announced as status.
