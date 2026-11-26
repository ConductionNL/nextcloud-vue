# CnAppTileWidgetForm

The `CnAddWidgetModal` sub-form of an `app-tile` placement: the app of the reader's navigation it opens, its colour from the eight theme colours (each swatch previews the white icon), whether it is pinned and whether it shows the number of new items. The form is invalid without an app.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `editingWidget` | `Object` | `null` | The placement being edited, or `null` in create mode. |
| `value` | `Object` | `{}` | Initial content values when not editing. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:content` | `object` | The content `{ appId, colour, showCount, pinned }` after every change. |
