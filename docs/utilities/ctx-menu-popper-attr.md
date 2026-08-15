# CTX_MENU_POPPER_ATTR

Attribute name (`data-cn-ctx-menu-popper`) that [`CnContextMenu`](../components/cn-context-menu.md) stamps on its own `.v-popper__popper` element, and the only hook the shared cursor-positioning CSS keys on.

Scoping matters: `NcActions` gives every popper the same `action-item__popper` base class, so a selector that only tested [`CTX_MENU_DATA_ATTR`](./ctx-menu-data-attr.md) on `<html>` would match *every* open popover on the page — including each table row's own actions menu, which would then render at the last right-click coordinates instead of under its button. Use this attribute, not the document one, when writing CSS that should apply to the context menu's popper alone.

It is an attribute rather than a class on purpose: floating-vue binds a dynamic `class` on that element (`--shown`, `--hidden`, `--show-from`, …), and Vue's `patchClass` assigns `el.className` wholesale, so a class added from JS is wiped the first time the popper opens.

```js
import { CTX_MENU_POPPER_ATTR } from '@conduction/nextcloud-vue'
```
