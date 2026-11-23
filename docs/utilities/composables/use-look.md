---
sidebar_position: 40
---

# useLook

Resolves the look a component is drawn in: the Nextcloud look (default) or the board look that matches the screens on identity.conduction.nl/screens.

An app opts in with `look: "board"` at the root of its manifest, and a single page with `config.look`. `CnAppRoot` and `CnPageRenderer` provide the resolved value as `cnLook`. A component's own `look` prop wins over that value. An unknown value falls back to `nextcloud`, so an app without the key renders as before.

## Signature

```js
const { look, isBoard, lookClass } = useLook(props)
```

| Return | Type | Meaning |
|---|---|---|
| `look` | `ComputedRef<string>` | `board` or `nextcloud` |
| `isBoard` | `ComputedRef<boolean>` | true in the board look |
| `lookClass` | `ComputedRef<string>` | `cn-look-board` in the board look, an empty string otherwise |

## Usage

Declare a `look` prop without a default and call the helper from `setup`:

```js
import { useLook } from '@conduction/nextcloud-vue'

export default {
	props: {
		look: { type: String, default: undefined },
	},
	setup(props) {
		return useLook(props)
	},
}
```

A dialog is teleported to `document.body`, outside `CnAppRoot`, so no `.cn-look-board` rule reaches it. Bind `lookClass` on the dialog's own container:

```vue
<NcDialog :class="lookClass" ... />
```

Board rules live under `.cn-look-board` and use the `--cn-board-*` properties from `src/css/look-board.css`.
