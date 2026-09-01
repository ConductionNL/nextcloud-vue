# useCurrentTheme

`useCurrentTheme()` returns the active Nextcloud theme (`'light'` or
`'dark'`) as a reactive computed. It tracks both runtime change paths: the
`data-theme-*` attributes Nextcloud stamps on `<body>` when the user picks a
theme, and the OS-level `prefers-color-scheme` change while the "system
default" theme is selected — so theme-variant rendering follows a live flip
without a reload.

```js
import { useCurrentTheme, resolveFolderColor } from '@conduction/nextcloud-vue'

const theme = useCurrentTheme()
const tint = computed(() => resolveFolderColor(props.color, theme.value))
```

The options-API counterpart is [`currentTheme()`](../current-theme.md) — a
plain reactive read for use inside a `computed`.

Watchers (one `MutationObserver` + one media-query listener) are installed
lazily on first use and shared module-wide, however many components consume
the theme. The non-reactive one-shot answer remains `getTheme()` in
`utils/getTheme.js`, which this composable wraps.
