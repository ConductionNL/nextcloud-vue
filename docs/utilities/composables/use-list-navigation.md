# useListNavigation

Gives a detail page next and previous within the list the record was opened from.

A handler working a queue of forty opens the fourth case, reads it, and wants the fifth. Today that is back, find your place, click. Frappe Helpdesk keeps `get_navigation_tickets`, `get_navigation_filters` and `get_navigation_order_by` together for the reason this composable exists: "the next case" is meaningless until you know next in *which* list, filtered how and sorted how.

## Usage

```js
import { useListNavigation } from '@conduction/nextcloud-vue'

const nav = useListNavigation({
  route: useRoute(),
  router: useRouter(),
  currentId: toRef(props, 'objectId'),
  objectType: 'case',
})
```

```vue
<CnDetailPage
  :listNavigation="nav"
  @next-record="nav.goNext"
  @previous-record="nav.goPrevious" />
```

`CnPageRenderer` puts the list context into the record's address for you when the row was opened from a manifest index page. Nothing to wire.

## Options

| Option | Type | Description |
|---|---|---|
| `route` | Object \| Ref | The current route. The list context is read from its query. |
| `router` | Object | The router. Without one, `goNext` and `goPrevious` resolve the id and do not navigate. |
| `currentId` | String \| Ref | The record open now. |
| `objectType` | String | Object type slug, for the default fetcher. |
| `objectStore` | Object | An object store, for the default fetcher. |
| `fetchList` | Function | Loads the list. Receives API params, returns records or ids. Overrides the store fetcher. |
| `rowKey` | String | Field a record's id is read from. Defaults to `id`. |
| `limit` | Number | How many records of the list to hold. Defaults to 200. |

## What it returns

| Key | Type | Description |
|---|---|---|
| `available` | `ComputedRef<boolean>` | Whether to offer the controls at all. |
| `position`, `total` | `ComputedRef<number>` | Where this record sits, and how long the list is. |
| `isFirst`, `isLast` | `ComputedRef<boolean>` | Whether this is either end of the list. |
| `hasNext`, `hasPrevious` | `ComputedRef<boolean>` | Whether there is a record to step to. |
| `goNext`, `goPrevious` | `Function` | Open that record. Returns its id, or `null` at either end. |
| `neighbours` | `ComputedRef<object>` | The full shape: `{ position, total, previousId, nextId, isFirst, isLast, known }`. |
| `context` | `ComputedRef<object \| null>` | The list the address names, or `null`. |
| `loading`, `failed` | `Ref<boolean>` | The load's state. |
| `refresh` | `Function` | Reload the list. |

## The refusals

Three cases offer nothing, and each is deliberate. A next button that steps somewhere the reader never chose is worse than no next button.

- **A link carrying no list context.** No request is made and neither control renders, rather than inferring an order from an unfiltered fetch.
- **A record the list does not hold.** The list has moved on, or the record is on another page of it. Offering a next from a position nobody knows would step somewhere arbitrary.
- **A list that could not be read.** The controls stay away instead of reporting "1 of 0".

The first and the last record say so rather than wrapping. A next button on the last case that silently returns to the first is a handler who believes they are still working forwards through a queue they already finished.

## A reload keeps the queue

The context lives in the route, not in a store, so a reload rebuilds the navigation from the address alone. Stepping through a list does not refetch it: only a change to the list the address names does.

## Next

Give the reader somewhere to step from: turn on [the split view](../../components/cn-index-page.md#split-view) and the list never leaves the screen.
