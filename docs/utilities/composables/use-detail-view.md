---
sidebar_position: 2
---

# useDetailView

Composable for a detail/edit view backed by [`useObjectStore`](../../store/object-store.md). Handles fetch-on-mount, re-fetch when the `id` changes, save/delete operations with 422 validation-error handling, optional post-save/delete router navigation, and the delete-confirmation dialog state.

Two calling styles are supported:

- **Object-store API** (`useDetailView(objectType, id, options)`) — recommended.
- **Legacy API** (`useDetailView(options)`) — takes explicit `fetchFn`/`saveFn`/`deleteFn`; preserved for pre-store consumers.

## Signature — object-store API

```js
import { useRouter } from 'vue-router/composables'
import { useDetailView } from '@conduction/nextcloud-vue'

const {
  object, loading, isNew, editing, saving,
  showDeleteDialog, error, validationErrors,
  onSave, confirmDelete,
} = useDetailView('client', props.id, {
  router: useRouter(),
  listRouteName: 'ClientList',
  detailRouteName: 'ClientDetail',
})
```

### Parameters

| Arg | Type | Description |
|-----|------|-------------|
| `objectType` | `string` | Slug registered in the object store. |
| `id` | `string \| Ref<string>` | Object ID, or `'new'` / falsy for a create view. A plain string is wrapped in a ref; a `Ref` is watched and triggers a re-fetch when it changes. |
| `options.objectStore` | `Function` | Store factory from `createObjectStore(id)`. Called as `opts.objectStore()`. Defaults to the shared `useObjectStore`. |
| `options.router` | `object \| null` | Vue Router instance. Required for post-save/delete navigation. |
| `options.listRouteName` | `string \| null` | Route to navigate to after successful delete. |
| `options.detailRouteName` | `string \| null` | Route to navigate to after successful create (receives `{ params: { id } }`). |
| `options.nameField` | `string` | Reserved for error-message formatting. |

### Return value

Store-derived:
- `object` — `{}` when `isNew`, otherwise `objectStore.getObject(objectType, id)`.
- `loading` — `objectStore.loading[objectType]`.

Computed:
- `isNew` — `true` when `id` is falsy or the literal string `'new'`.

Local state:
- `editing`, `saving`, `showDeleteDialog` — booleans.
- `error` — Top-level error message string, or `null`.
- `validationErrors` — Populated from the 422 response body (`response.data.errors` or the raw data object); `null` otherwise.

Operations:
- `onSave(formData)` — POST when `isNew`, PUT otherwise (ID is spread onto the payload). On successful create with `detailRouteName`, navigates to the detail route. On successful update, sets `editing = false` and re-fetches. Returns the saved object or `null`.
- `confirmDelete()` — Calls `objectStore.deleteObject`. On success, closes the dialog and navigates to `listRouteName` if configured. Returns `true`/`false`.

### Lifecycle

- `onMounted` fetches the object unless `isNew`.
- `watch(idRef)` re-fetches when the ID changes (e.g. router param change on the same route component).

## Signature — legacy API

```js
const {
  objectData, editing, loading, saving, showDeleteDialog, error,
  load, save, confirmDelete, executeDelete,
} = useDetailView({
  objectType: 'client',
  fetchFn: (type, id) => objectStore.fetchObject(type, id),
  saveFn: (type, data) => objectStore.saveObject(type, data),
  deleteFn: (type, id) => objectStore.deleteObject(type, id),
  onSaved: (result) => {},
  onDeleted: () => {},
})
```

In this form the caller owns the data lifecycle: `load(id)` populates `objectData`, `save(formData?)` persists, `confirmDelete()` just toggles the dialog, and `executeDelete(id?)` performs the actual delete. Use only when you can't adopt the object store.

## Related

- [CnDetailPage](../../components/cn-detail-page.md) / [CnFormDialog](../../components/cn-form-dialog.md) — Typical consumers.
- [useObjectStore](../../store/object-store.md) — Backing store.
