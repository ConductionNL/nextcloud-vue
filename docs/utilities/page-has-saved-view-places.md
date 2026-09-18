# pageHasSavedViewPlaces

Whether a manifest page declares that its saved views are places.

## Signature

```js
pageHasSavedViewPlaces(page: object): boolean
```

`page` is a manifest page entry.

## Usage

```js
import { pageHasSavedViewPlaces } from '@conduction/nextcloud-vue'

pageHasSavedViewPlaces({ type: 'index', savedViewPlaces: { enabled: true } })  // true
pageHasSavedViewPlaces({ type: 'index', savedViewPlaces: { enabled: false } }) // false
pageHasSavedViewPlaces({ type: 'index' })                                      // false
pageHasSavedViewPlaces({ type: 'detail', savedViewPlaces: { enabled: true } }) // false
```

## Both halves have to be true

The key must be there and `enabled` must be true, the same rule the split view follows. A page carrying `{ enabled: false }` renders exactly like a page that never named the key, so a team can turn the feature off without deleting what they configured.

Only an index page qualifies. A detail page has no list to save a lens of.

Every other function in this module asks this one first, so a page that declares nothing contributes no routes, no menu children and no targets. Call it yourself before you build a link.
