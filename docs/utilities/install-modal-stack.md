# installModalStack

`installModalStack(root?)` makes the most recently opened modal the one that
receives pointer events, by giving every `.modal-mask` that enters the DOM its
own stacking layer.

## The problem it solves

`@nextcloud/vue` v9 ships a flat `.modal-mask { z-index: 9998 }` in `NcModal`'s
scoped stylesheet, and `NcDialog` renders an `NcModal`, so **every** dialog in an
app lands on the same layer. Equal `z-index` means the painting order falls back
to DOM order — and `NcModal` teleports its mask to `<body>`, so which of two open
masks comes first is a mount-timing race.

The mask is `position: fixed` at 100% × 100% and the dialog content is its
descendant, so the loser of that race has its whole dialog painted *underneath*
the other dialog's full-viewport mask. Both dialogs look open and visible, but
every click aimed at the top one is swallowed by the one beneath it.

Observed in Buildiq: the nested "Generate an app with AI" dialog was visible on
top of the "Create application" wizard, yet every click on it was received by the
wizard's own `#wizard-app-description` textarea.

Wrapping the inner dialog in `<Teleport to="body">` does **not** help — both
masks are already in `<body>`. The tie is the problem, not the teleport target.

## Import

```js
import { installModalStack, uninstallModalStack } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function installModalStack(root?: Element): () => void
```

| Argument | Type      | Default         | Meaning                                     |
| -------- | --------- | --------------- | ------------------------------------------- |
| `root`   | `Element` | `document.body` | Subtree to watch for `.modal-mask` elements. |

Returns the uninstall function (the same one exported as
`uninstallModalStack`).

## Usage

`CnAppRoot` calls this on `mounted()` and `uninstallModalStack()` on
`beforeUnmount()`, so **manifest-driven apps need no wiring at all**.

Apps that do not mount `CnAppRoot` should call it once during bootstrap:

```js
import { installModalStack } from '@conduction/nextcloud-vue'

installModalStack()

new Vue({ render: (h) => h(App) }).$mount('#content')
```

Calling it twice never adds a second observer or double-counts a mask, so it is
safe for both the app root and your own `main.js` to call it. It is
**reference-counted**: each call registers an owner and the binder only stops
once every owner has released it. App roots nest — Buildiq's `BuilderHost`
renders a second `CnAppRoot` for the app being previewed — and the inner shell
unmounting must not blind the outer one.

## How it works

A `MutationObserver` watches `root` for `.modal-mask` insertions and removals:

- **On insertion**, the mask takes the next layer strictly above the current top
  (`10005`, then `10010`, then `10015`, …) and that value is written as an
  **inline** `z-index`. Inline styles outrank any non-`!important` declaration,
  so this beats `@nextcloud/vue`'s scoped constant and the library's own baseline
  in `src/css/patches.css`.
- **On removal**, the mask releases its layer. Because each new layer is derived
  from the *current* top rather than from a monotonic counter, closing everything
  brings the numbers back down: open → open → close → close leaves the stack
  empty and the next dialog opens on the base layer again. Nothing drifts upward
  over a long session.
- Closing out of order works either way round: closing the inner dialog restores
  the outer one as top-most; closing the outer one first leaves the inner one on
  top.
- A mask that Vue *moves* (a teleport relocation shows up as a remove + add pair)
  keeps the layer it already has, so an outer dialog can never leapfrog its own
  child.

### Why a DOM observer rather than a prop

The dialogs that collide are not all this library's. In the Buildiq case the
wizard is `CnWizardDialog` (ours) but the AI dialog is a plain `NcDialog` written
in the consuming app, and `@nextcloud/vue` exposes no z-index prop. A
per-component opt-in would therefore only ever fix half of a collision. Watching
the DOM covers every modal in the app — ours, the consumer's, and
`@nextcloud/vue`'s own internal ones — with no call sites to keep in sync.

## Caveat: the CSS baseline must not be `!important`

`src/css/patches.css` carries the unscoped baseline:

```css
.modal-mask.dialog__modal {
	z-index: 10005;
}
```

This must stay **without** `!important`, or it beats the inline layer and
flattens every open dialog back onto one layer — reinstating the bug.
`tests/utils/modalStack.spec.js` asserts this.

## Internals

The stack itself (`acquireModalLayer`, `releaseModalLayer`, `topModalZIndex`,
`modalStackDepth`, `resetModalStack`, `isModalStackInstalled`,
`MODAL_STACK_BASE_Z_INDEX`, `MODAL_STACK_STEP`) is not re-exported from the
barrel. Import it from the module directly if you need to slot a popover between
two dialog layers:

```js
import { topModalZIndex, MODAL_STACK_STEP } from '@conduction/nextcloud-vue/src/utils/modalStack.js'
```

## See also

- [`uninstallModalStack`](./uninstall-modal-stack.md)
- [`CnAppRoot`](../components/cn-app-root.md)
