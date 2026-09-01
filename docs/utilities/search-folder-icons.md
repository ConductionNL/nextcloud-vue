# searchFolderIcons

`searchFolderIcons(query, translate?)` filters
[`FOLDER_ICONS`](./folder-icons.md) case-insensitively. An empty query
returns the full catalog.

The match runs over the stable key, the English label, **and** — when the
host app's `translate` function is passed — the translated label, so a
Dutch user typing "reizen" finds the travel icon their UI labels that way.

```js
import { searchFolderIcons } from '@conduction/nextcloud-vue'

searchFolderIcons('work').map((e) => e.key) // ['briefcase']
searchFolderIcons('reizen', (s) => t('myapp', s)) // ['airplane'] under a Dutch catalog
```

[`CnIconColorPicker`](../components/cn-icon-color-picker.md) uses this for
its search field, passing its own `translate` prop through.
