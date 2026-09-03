---
sidebar_position: 5
---

# Icons

By the end of this page you have an icon on screen, from the source that fits your app.

The library ships four icon sources. They are not interchangeable. Pick one per surface, using the table below, then follow the section for it.

## Pick a source

| Source | What you get | Use it when |
|---|---|---|
| The MDI registry | Material Design Icons, registered per app | App chrome: navigation, buttons, menus, actions |
| NL government sets | 1,488 bundled Dutch government icons | Your app has to look like Dutch government |
| A URL or data URI | Anything the user picked | An icon is stored on an object and travels with it |
| An MDI path string | The raw `d` attribute from `@mdi/js` | Widget config and manifests, where a component will not fit |

The first two cover almost every case. Read on for the one you picked.

## Register the MDI icons your app uses

`CnIcon` renders by PascalCase name from a registry your app fills. Only `HelpCircleOutline` is registered up front, as the fallback. MDI has over 7,000 icons and bundling all of them would cost your users several megabytes, so you register the handful you need.

Register before you mount Vue:

```js
// main.js
import { registerIcons } from '@conduction/nextcloud-vue'
import AccountGroupOutline from 'vue-material-design-icons/AccountGroupOutline.vue'
import Cog from 'vue-material-design-icons/Cog.vue'

registerIcons({ AccountGroupOutline, Cog })
```

Then render one:

```vue
<CnIcon name="AccountGroupOutline" :size="20" />
```

You should see the icon. If you see a question mark instead, that name is not registered and `CnIcon` fell back. Check the spelling against the file name in `vue-material-design-icons`.

## Offer the NL government sets in a picker

`CnIconBrowser` already offers the three Dutch government sets. You do not have to pass them:

```vue
<CnIconBrowser v-model="icon" />
```

The user gets a tab per set and picks an icon. What you store back is a `data:image/svg+xml` URI, so the icon renders in any app later, whether or not that app carries the catalogue it came from.

Two of the three sets load with the page. RVO is the third and it is large, so the browser fetches it the first time someone opens its tab. See [NL government icon sets](./nl-government-sets.md) for the sizes, the licences and how to load one set on its own.

## Render whatever you stored

An icon that came from a picker is a URL or a data URI, not a registry name. `CnIcon` takes a name, so use `isCustomIconUrl` to tell the two apart:

```js
import { isCustomIconUrl } from '@conduction/nextcloud-vue'
```

```vue
<img v-if="isCustomIconUrl(icon)" :src="icon" alt="" width="20" height="20">
<CnIcon v-else :name="icon" :size="20" />
```

## Convert a catalogue you already have

If your app carries its own icon list, four adapters reshape it for the pickers:

| Adapter | Turns into a catalogue |
|---|---|
| `fromMdiJs` | `@mdi/js` path exports |
| `fromFontAwesome` | A Font Awesome icon set |
| `fromOpenGemeenten` | An OpenGemeenten export |
| `dedupeCatalogue` | Removes duplicates after you merge two of the above |

All four are exported from the package root.

## Next

Read [NL government icon sets](./nl-government-sets.md) before you import one, because the import path decides how much of it lands in your bundle.
