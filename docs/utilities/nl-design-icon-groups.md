# NL_DESIGN_ICON_GROUPS

`NL_DESIGN_ICON_GROUPS` — the three bundled NL-government icon catalogues split
by set, ready for [CnIconBrowser](../components/cn-icon-browser.md)'s
`url-icon-groups` prop (a searchable sub-tab per set). Shape:
`[{ key, label, icons: [{ id, label, url }] }]`.

| key | label | set | licence | icons |
| --- | --- | --- | --- | --- |
| `rvo` | RVO | [rvoIcons](./rvo-icons.md) | CC0-1.0 | 1163 |
| `open-gemeenten` | Gemeente | [openGemeentenIcons](./open-gemeenten-icons.md) | CC0-1.0 | 256 |
| `den-haag` | Den Haag | [denHaagIcons](./den-haag-icons.md) | EUPL-1.2 | 69 |

```js
import { NL_DESIGN_ICON_GROUPS } from '@conduction/nextcloud-vue'
// <CnIconBrowser :url-icon-groups="NL_DESIGN_ICON_GROUPS" … />
```

Every icon is a self-contained `data:` URI, so the pack works with **no external
`nldesign` app installed**. For the flat combined list use
[NL_DESIGN_ICONS](./nl-design-icons.md).
