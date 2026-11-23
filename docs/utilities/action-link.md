# actionLink

The link a manifest action renders as when its only job is to navigate to a target known at render time. A surface that draws actions uses it to render an `<a href>` (an `NcActionLink`, or an `NcButton` with `href`) instead of a button that dispatches, so the user can middle-click it, open it in a new tab or copy the address.

## Import

```js
import { actionLink } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function actionLink(
    action: object,
    context?: { router?: object, tokenCtx?: object },
): { href: string, to: string | object | null, external: boolean } | null
```

| Name | Type | Description |
|------|------|-------------|
| `action` | `object` | The manifest action. |
| `context.router` | `object` | The app's router, needed for an in-app target. |
| `context.tokenCtx` | `object` | Token context a `navigate` target is interpolated against (the same grammar and shape [`dispatchAction`](./dispatch-action.md) uses). |

It answers for two action types:

- `type: "navigate"` — the target is interpolated first. An external target (`http(s)://`, `//`, `mailto:`, `tel:`) returns `{ href: target, to: null, external: true }`, to open in a new tab. An in-app path returns the router-resolved `href` and `to: path`.
- `type: "open-page"` — returns the router-resolved `href` of `{ name: target }` and that location as `to`.

Everything else returns `null`, as does a `confirm: true` action (the confirm gate has to run first) and an in-app target the router cannot resolve. A `null` action stays a button and dispatches.

`to` is what a plain click should hand the router; follow it with [`followLinkClick`](./follow-link-click.md) so a modified or middle click is left to the browser.

## Usage

```js
import { actionLink, dispatchAction, followLinkClick } from '@conduction/nextcloud-vue'

const link = actionLink(action, { router: this.$router, tokenCtx })
if (link) {
    // <a :href="link.href" :target="link.external ? '_blank' : undefined" @click="onClick">
    // onClick(event) { if (link.to) followLinkClick(event, link.to, this.$router) }
} else {
    // <button @click="dispatchAction(action, { router: this.$router, tokenCtx })">
}
```

To render a row action as a link in [`CnRowActions`](../components/cn-row-actions.md), pass the result as the action's `to` (in-app) or `href` + `linkTarget: '_blank'` (external).
