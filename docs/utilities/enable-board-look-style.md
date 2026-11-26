# enableBoardLookStyle

Switches the board-look rules on for the page. The published library installs the board look's stylesheet (`css/look-board*.css`, some 260 `:has()` rules) as its own `<style data-cn-library-board media="not all">` right after the library stylesheet, so a page that never draws the board look does not pay the browser's `:has()` invalidation cost for them. The first call removes that `media` and sets [`BOARD_LOOK_FLAG`](./board-look-flag.md) on `<html>`, so a newer library build that installs its board sheet later comes in switched on.

`useLook()`, `CnAppRoot`, `CnPageRenderer` and `CnDetailPage` call it themselves, before their first render, when they resolve the board look. Call it yourself only when your app puts `cn-look-board` on its own markup without any of those.

## Import

```js
import { enableBoardLookStyle } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function enableBoardLookStyle(doc?: Document): boolean
```

| Name | Type | Description |
|------|------|-------------|
| `doc` | `Document` | The document; defaults to the global one. |

It returns `true` when this call switched the rules on, and `false` when they already were on or there is no document.

## Usage

```js
import { enableBoardLookStyle } from '@conduction/nextcloud-vue'

export default {
	created() {
		// This view draws its own `.cn-look-board` wrapper.
		enableBoardLookStyle()
	},
}
```

## In an app bundle

Webpack drops the published entry's bare `import './library-style.js'`, so in an app the library rules come from its own `import '@conduction/nextcloud-vue/css/index.css'`. That file is the library sheet **without** the board-look block (`dist/nextcloud-vue.base.css`); `dist/nextcloud-vue.css` stays complete. When no board sheet is on the page, the first call adds `<style data-cn-library-board>` with the board-look rules (carried as text in the library's JS) directly after the library sheet, so they keep their place before the app's own stylesheets.

An app that bundles the library source gets every rule in one sheet, as before; there the call only sets the flag.
