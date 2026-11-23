# isModifiedClick

Whether the browser should handle a click itself (new tab, new window, download) instead of the app navigating in place: true for a ctrl/cmd/shift/alt click or a non-primary button.

## Parameters

| Name | Type | Description |
|------|------|-------------|
| `event` | `MouseEvent \| KeyboardEvent \| null` | The click event. |

Returns `false` without an event.

## Usage

```js
import { isModifiedClick } from '@conduction/nextcloud-vue'

onLinkClick(event) {
	if (isModifiedClick(event)) {
		return // let the browser open it
	}
	event.preventDefault()
	// …navigate in place
}
```

[`followLinkClick`](./follow-link-click.md) wraps this for the common case.
