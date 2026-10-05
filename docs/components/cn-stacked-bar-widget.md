# CnStackedBarWidget

One bar cut into segments, with a legend below it that names every segment and gives its count. Use it to show how a total divides over a few groups, such as "my cases per step". Registered under the `stacked-bar` type and configured by [`CnStackedBarWidgetForm`](./cn-stacked-bar-widget-form.md).

Segments come from one grouped count request against an OpenRegister source, or from static `segments`.

## Manifest

```json
{
  "widgetKey": "stacked-bar",
  "slot": "body",
  "gridX": 0, "gridY": 3, "gridWidth": 8, "gridHeight": 2,
  "props": {
    "content": {
      "source": { "register": "dossiq", "schema": "case", "groupBy": "status", "filter": { "assignee": "@me" } },
      "order": ["received", "in_progress", "decision", "publish"],
      "labels": {
        "received": "Received",
        "in_progress": "In progress",
        "decision": "Decision",
        "publish": "Publish"
      }
    }
  }
}
```

With static values:

```json
{
  "widgetKey": "stacked-bar",
  "props": {
    "content": {
      "segments": [
        { "label": "Phone", "value": 9 },
        { "label": "E-mail", "value": 4 },
        { "label": "Counter", "value": 2 }
      ]
    }
  }
}
```

## Content shape

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `source` | `{ register, schema, groupBy, filter? }` | none | The OpenRegister source. `groupBy` is the field the records are counted per. `filter` takes the shared @-token grammar. |
| `segments` | `Array<{ key?, label, value }>` | `[]` | Static segments, used when there is no source. |
| `order` | `string[]` | `[]` | Group keys in the order they render. Groups it does not list follow in the order they arrive. A listed key without records shows a count of 0. |
| `labels` | `{ [key]: string }` | `{}` | The label of a group key. Without one the key itself is shown. |
| `emptyText` | `string` | "Nothing to show yet" | Shown when the total is 0. |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The configuration blob described above. |
| `translate` | `function` | `null` | Translate function for labels and the empty text. Falls back to the injected `cnTranslate`. |

## Colours

The segments take their colour from one ramp built on the theme: a light tint of the primary colour, the primary colour itself, then steps towards the text colour. The steps differ in lightness, never in hue alone, so they stay apart for somebody who cannot tell hues apart. The ramp follows the theme, dark mode included, because it only uses Nextcloud variables.

## Accessibility

The legend is a list that holds every label and count. The bar is a picture of that list, so it is `aria-hidden` and nothing is read twice.
