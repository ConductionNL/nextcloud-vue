# isRowMiddleClick

Whether an `auxclick` on a row or card is a middle click meant for the row itself, not for a control inside it (a button, link, checkbox or input). Use it to filter an `@auxclick` listener; a right click also fires `auxclick` and is rejected.

[`openRowTarget`](./open-row-target.md) already ignores clicks from nested controls, so a listener that only calls it does not need this.

## Parameters

| Name | Type | Description |
|------|------|-------------|
| `event` | `MouseEvent \| null` | The `auxclick` event. |

Returns true for a middle-button click whose target is not inside a nested control.

## Usage

```vue
<tr @auxclick="isRowMiddleClick($event) && $emit('open', row, $event)">
```

```js
import { isRowMiddleClick } from '@conduction/nextcloud-vue'
```
