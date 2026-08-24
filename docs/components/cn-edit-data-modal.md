# CnEditDataModal

Isolated `NcDialog` (ADR-004 modal isolation) that surfaces the **data an app
reads and writes**: the registers and schemas its pages and widgets are bound
to.

Unlike the other manifest editors it takes the resolved `manifest` rather than a
`working` copy, because it presents what the app is already bound to rather than
mutating the manifest in place.

Opened by [CnBuildiqEditButton](./cn-buildiq-edit-button.md)'s "Edit data…"
item, and mountable on its own surface by any consumer.

## Import

```js
import { CnEditDataModal } from '@conduction/nextcloud-vue'
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `manifest` | `Object` | `null` | The resolved manifest whose register and schema bindings are shown. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `close` | — | Emitted when the modal is dismissed. |

## Why data comes first

A widget is a view and a schema is what it views, so a widget with nothing bound
to it has nothing to show. This modal is where you check that binding when a
page renders empty.
