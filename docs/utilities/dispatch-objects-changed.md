# dispatchObjectsChanged

Announces that objects of a register and schema changed somewhere the listing page cannot see, such as an app's own modal saving an object or uploading files to it. Every mounted [`CnIndexPage`](../components/cn-index-page.md) showing that register and schema refreshes its list.

## Signature

```js
import { dispatchObjectsChanged } from '@conduction/nextcloud-vue'

dispatchObjectsChanged({ register: 'publication', schema: 'publication', id: objectId })
```

The single `payload` argument is an object with these fields:

| Field | Type | Description |
|-------|------|-------------|
| `register` | `string \| number` | Register slug or id. Optional. |
| `schema` | `string \| number` | Schema slug or id. Optional. |
| `id` | `string` | The changed object's id. Optional, informational. |

Returns `true` when the event was dispatched, and `false` when there is no `window`.

## Matching

The signal is a `cn:objects-changed` window event. A `CnIndexPage` refreshes when:

- the `register` matches its `register` prop, and
- the `schema` matches its `schema` prop or its resolved schema's id or slug.

If either side leaves out a part, that part counts as a match. So pass the identifiers the page itself uses: a page configured with slugs does not recognise a numeric register id.

## When to use it

Saves that go through `CnIndexPage`'s own dialogs already refresh the list, so this is only needed for writes that bypass them. For example:

- a bespoke edit modal that calls the API directly;
- a file-upload dialog, where `@self.files` changes without the object being saved.
