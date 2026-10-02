# openRowTarget

Navigate from a surface that cannot be an `<a>`, such as a table row or a draggable card, the way a link would. A ctrl/cmd/shift or middle click opens the target in a new tab; a plain click navigates in place.

Bind it to both `@click` and `@auxclick`: a middle click fires only `auxclick`.

A click that comes from a control inside the row (a button, link, checkbox or input) is left to that control. When it opens a new tab it marks the event as handled (and prevents its default), and it skips an event that is already marked (see [`isNewTabHandled`](./is-new-tab-handled.md)), so a host calling it from `@row-click` on a table that also navigates never opens a second tab.

A string target is a finished URL. Pass a router path as `{ path: '/leads/7' }` so its href gets the app's base.

## Parameters

| Name | Type | Description |
|------|------|-------------|
| `event` | `MouseEvent \| KeyboardEvent \| null` | The click event. Without one it navigates in place. |
| `target` | `string \| object` | A URL, or a vue-router location. |
| `router` | `object` | The app's router, needed for a location. |

Returns `true` when it navigated. A right click, or a location without a router, does nothing.

## Usage

```vue
<tr
	@click="openRowTarget($event, { name: 'LeadDetail', params: { id: row.id } }, $router)"
	@auxclick="openRowTarget($event, { name: 'LeadDetail', params: { id: row.id } }, $router)">
```

```js
import { openRowTarget } from '@conduction/nextcloud-vue'
```

When the control can be a real link, make it one instead and use [`followLinkClick`](./follow-link-click.md): only a real `<a href>` can be copied and shows its URL on hover. See also [`resolveHref`](./resolve-href.md) and [`isModifiedClick`](./is-modified-click.md).
