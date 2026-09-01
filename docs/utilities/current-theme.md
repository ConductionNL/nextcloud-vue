# currentTheme

`currentTheme()` returns the active Nextcloud theme (`'light'` or `'dark'`)
as a plain **reactive read** — the options-API counterpart of
[`useCurrentTheme`](./composables/use-current-theme.md). Call it inside a
`computed` (or the template) and the component re-renders when the user
flips Nextcloud's theme or their OS color-scheme preference changes.

```js
import { currentTheme, resolveFolderColor } from '@conduction/nextcloud-vue'

export default {
  computed: {
    tint() {
      return resolveFolderColor(this.folder.customColor, currentTheme())
    },
  },
}
```

Shares the same lazily installed module-wide watchers as
`useCurrentTheme()`; calling either (or both) installs exactly one
`MutationObserver` per page.
