# uninstallModalStack

`uninstallModalStack()` stops the modal-stacking observer installed by
[`installModalStack`](./install-modal-stack.md) and releases every layer it is
holding.

## Import

```js
import { uninstallModalStack } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function uninstallModalStack(): void
```

## Usage

`CnAppRoot` calls this on `beforeUnmount()`, so manifest-driven apps need no
wiring. Call it yourself only if you called `installModalStack()` yourself and
want to scope the side effect to something shorter-lived than the page — a test
teardown, or a widget that owns its own Vue app.

```js
import { installModalStack, uninstallModalStack } from '@conduction/nextcloud-vue'

const stop = installModalStack()
// … later, equivalently:
uninstallModalStack()
```

`installModalStack()` returns this same function, so either form works.

## Reference counting

Each `installModalStack()` call registers an owner; each `uninstallModalStack()`
call releases one. The observer only actually stops on the **last** release, so a
nested app shell unmounting cannot blind the outer one. Two installs therefore
need two uninstalls.

Test teardown usually wants an unconditional teardown instead — import
`resetModalStack()` from `src/utils/modalStack.js`, which ignores the reference
count and always disconnects.

## What it does not do

Inline `z-index` values already written to open masks are **left in place**.
Uninstall happens when an app shell unmounts, and stripping the layer off a mask
that is still on screen would drop it back under whatever it was covering. The
observer stops, the layers are released from the stack, and the DOM is left
alone.

Safe to call when nothing is installed — it is a no-op.

## See also

- [`installModalStack`](./install-modal-stack.md)
