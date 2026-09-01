# FOLDER_ICONS

The curated icon set for folder/vault personalization: 42 entries of
`{ key, label, component }`, where `key` is the stable kebab-case identifier
an app persists, `label` is the English source string for the app's own
l10n, and `component` is the imported MDI icon component.

Rendered by [`CnIconColorPicker`](../components/cn-icon-color-picker.md) as
the searchable grid; stored keys resolve back through
[`resolveFolderIcon`](./resolve-folder-icon.md).

```js
import { FOLDER_ICONS } from '@conduction/nextcloud-vue'

FOLDER_ICONS.find((e) => e.key === 'briefcase')
// { key: 'briefcase', label: 'Work', component: BriefcaseIcon }
```

The set is deliberately small (roughly Proton Pass's breadth): every label
is a translatable string in each consuming app, so growth is a considered,
additive change. Keys are stable API and are never renamed or removed.
