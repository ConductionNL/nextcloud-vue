# isNewTabHandled

Whether a click already opened its target in a new tab. [`openRowTarget`](./open-row-target.md) marks the event with `preventDefault()` when it opens a tab, and skips an event that is already marked, so two listeners on the same click (a component's own row navigation and a host's `@row-click`) never open two tabs.

Use it when a handler opens a new tab some other way, to stay out of that handshake's way.

## Parameters

| Name | Type | Description |
|------|------|-------------|
| `event` | `MouseEvent \| KeyboardEvent \| null` | The click event. |

Returns true for a ctrl/cmd/shift or middle click whose default was prevented.

## Usage

```js
import { isNewTabHandled } from '@conduction/nextcloud-vue'

onRowClick(row, event) {
	if (isNewTabHandled(event)) {
		return // the table already opened it
	}
	// …
}
```
