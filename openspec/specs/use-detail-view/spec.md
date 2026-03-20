# useDetailView Specification

## Purpose

`useDetailView(objectType, id, options?)` is a composable exported by `@conduction/nextcloud-vue` that provides reactive object data, save/delete operations, loading state, and optional post-operation router navigation for detail/edit views. It eliminates the boilerplate that was previously duplicated across every detail-view component.

---

## Requirements

### Requirement: objectStore integration

`useDetailView` SHALL connect to `useObjectStore()` internally and derive `object` and `loading` from the store for the given `objectType` and `id`. The component MUST NOT call `useObjectStore()` itself to obtain these values.

#### Scenario: object is read from store

- GIVEN a component uses `useDetailView('client', '123')`
- WHEN `objectStore.getObject('client', '123')` returns `{ id: '123', name: 'Acme' }`
- THEN the `object` computed ref returned by the composable equals that object

#### Scenario: new object returns empty object

- GIVEN `id` is `'new'`
- WHEN `useDetailView('client', 'new')` is called
- THEN `object.value` is `{}` and `isNew.value` is `true`

#### Scenario: isNew is false for existing objects

- GIVEN `id` is `'123'`
- WHEN `useDetailView('client', '123')` is called
- THEN `isNew.value` is `false`

#### Scenario: missing or falsy id is treated as new

- GIVEN `id` is `null`, `undefined`, or `''`
- WHEN `useDetailView('client', id)` is called
- THEN `isNew.value` is `true` and `object.value` is `{}`

---

### Requirement: id parameter accepts both plain strings and Vue refs

`useDetailView` SHALL accept the `id` parameter as either a plain string or a Vue `Ref<string>`. When a plain string is provided, it SHALL be wrapped in a `ref()` internally. When a Vue ref is provided, it SHALL be used directly so that external mutations trigger re-fetching.

#### Scenario: plain string id is normalized to ref

- GIVEN `id` is the plain string `'123'`
- WHEN `useDetailView('client', '123')` is called
- THEN the composable creates an internal ref and watches it for changes

#### Scenario: Vue ref id is used directly

- GIVEN `id` is `ref('123')` from the calling component
- WHEN `useDetailView('client', id)` is called and `id.value` is later changed to `'456'`
- THEN the composable detects the change via its watcher and re-fetches the new object

---

### Requirement: auto-fetch on mount and id change

`useDetailView` SHALL call `objectStore.fetchObject(objectType, id)` in `onMounted` when `isNew` is `false`. When the `id` ref changes at runtime (e.g., route param change without remount), it SHALL re-fetch the new object. It SHALL NOT fetch when `id` is `'new'`, `null`, `undefined`, or `''`.

#### Scenario: existing object is fetched on mount

- GIVEN `id` is `'123'`
- WHEN the component mounts
- THEN `objectStore.fetchObject('client', '123')` is called exactly once

#### Scenario: new object is not fetched on mount

- GIVEN `id` is `'new'`
- WHEN the component mounts
- THEN `objectStore.fetchObject` is NOT called

#### Scenario: refetch when id changes

- GIVEN a component is mounted with `id = '123'`
- WHEN `id` changes to `'456'` (route param change without remount)
- THEN `objectStore.fetchObject('client', '456')` is called

#### Scenario: no fetch when id changes to new

- GIVEN a component is mounted with `id = '123'`
- WHEN `id` changes to `'new'`
- THEN `objectStore.fetchObject` is NOT called for the new value

---

### Requirement: loading state

`useDetailView` SHALL expose a `loading` computed ref that reflects `objectStore.loading[objectType]`. The consumer uses this to show loading indicators during fetch operations.

#### Scenario: loading reflects store loading state

- GIVEN `objectStore.loading['client']` is `true` during a fetch
- WHEN the consumer reads `loading.value`
- THEN `loading.value` is `true`

#### Scenario: loading defaults to false when objectType has no loading entry

- GIVEN `objectStore.loading` has no `'client'` key
- WHEN the consumer reads `loading.value`
- THEN `loading.value` is `false`

---

### Requirement: edit mode toggle

`useDetailView` SHALL expose an `editing` ref initialized to `false`. The consumer toggles this ref to switch between read and edit modes. On successful save of an existing object, `editing` SHALL be set back to `false` automatically.

#### Scenario: editing starts as false

- GIVEN `useDetailView('client', '123')` is called
- WHEN the composable returns
- THEN `editing.value` is `false`

#### Scenario: editing is reset after successful update

- GIVEN `editing.value` is `true` and `isNew` is `false`
- WHEN `onSave(formData)` succeeds
- THEN `editing.value` is set to `false`

#### Scenario: editing is not reset on create

- GIVEN `isNew` is `true`
- WHEN `onSave(formData)` succeeds and the router navigates to the detail route
- THEN the composable does not modify `editing` (navigation replaces the view)

---

### Requirement: save with validation

`useDetailView` SHALL provide an `onSave(formData)` async function. For new objects (`isNew` is `true`), it SHALL call `objectStore.saveObject(objectType, formData)` without an `id` field. For existing objects, it SHALL merge `{ id: idRef.value }` into `formData`. On success it SHALL return the saved object. On failure it SHALL return `null`.

#### Scenario: save creates new object and redirects

- GIVEN `isNew` is `true` and `options.detailRouteName` is `'ClientDetail'` and `options.router` is provided
- WHEN `onSave({ name: 'Acme' })` is called and the store returns `{ id: '456', name: 'Acme' }`
- THEN the router navigates to `{ name: 'ClientDetail', params: { id: '456' } }` and the function returns the saved object

#### Scenario: save updates existing object

- GIVEN `isNew` is `false` and `id` is `'123'`
- WHEN `onSave({ name: 'Updated' })` is called and the store succeeds
- THEN `editing.value` is set to `false`, `objectStore.fetchObject('client', '123')` is called to refresh the store, and the function returns the saved object

#### Scenario: save without router skips navigation on create

- GIVEN `isNew` is `true` and `options.router` is `null`
- WHEN `onSave({ name: 'Acme' })` is called and the store returns `{ id: '456' }`
- THEN no router navigation occurs and the function returns the saved object

#### Scenario: save handles null result from store

- GIVEN `objectStore.saveObject` returns `null` (indicating a store-level error)
- WHEN `onSave(formData)` is called
- THEN `error.value` is set to the store error message or `'Failed to save'` and the function returns `null`

---

### Requirement: saving state management

`useDetailView` SHALL expose a `saving` ref that is `true` while `onSave` is in progress and `false` otherwise. The ref SHALL be reset to `false` in a `finally` block to ensure it is always cleared, even on error.

#### Scenario: saving is true during save operation

- GIVEN `onSave` is called
- WHEN the save operation is in progress (awaiting the store)
- THEN `saving.value` is `true`

#### Scenario: saving is false after success

- GIVEN `onSave` has completed successfully
- WHEN the function returns
- THEN `saving.value` is `false`

#### Scenario: saving is false after error

- GIVEN `onSave` throws an error
- WHEN the function returns
- THEN `saving.value` is `false`

---

### Requirement: 422 validation error handling

When `onSave` catches an error with HTTP status 422, `useDetailView` SHALL populate the `validationErrors` ref with the error details from `err.response.data.errors` or `err.data.errors` or the entire error data object. It SHALL NOT set the generic `error` ref for 422 errors. Both `error` and `validationErrors` SHALL be cleared at the start of each `onSave` call.

#### Scenario: 422 error populates validationErrors

- GIVEN the store throws with `{ response: { status: 422, data: { errors: { email: 'Already taken' } } } }`
- WHEN `onSave(formData)` is called
- THEN `validationErrors.value` equals `{ email: 'Already taken' }` and `error.value` is `null`

#### Scenario: 422 error without nested errors key

- GIVEN the store throws with `{ status: 422, data: { email: 'Invalid format' } }`
- WHEN `onSave(formData)` is called
- THEN `validationErrors.value` equals `{ email: 'Invalid format' }`

#### Scenario: non-422 error sets generic error

- GIVEN the store throws with `{ message: 'Network error' }` and no 422 status
- WHEN `onSave(formData)` is called
- THEN `error.value` is `'Network error'` and `validationErrors.value` is `null`

#### Scenario: previous errors are cleared on new save attempt

- GIVEN `validationErrors.value` is `{ email: 'Already taken' }` from a previous call
- WHEN `onSave(formData)` is called again
- THEN `validationErrors.value` is reset to `null` and `error.value` is reset to `null` before the save executes

---

### Requirement: delete with confirmation flow

`useDetailView` SHALL provide `showDeleteDialog` (a ref controlling dialog visibility) and `confirmDelete()` (an async function that performs the deletion). On success, `confirmDelete` SHALL close the dialog and navigate to `options.listRouteName` if both `router` and `listRouteName` are provided. On failure, it SHALL set `error.value`.

#### Scenario: confirmDelete deletes and navigates

- GIVEN `options.listRouteName` is `'ClientList'`, `options.router` is provided, and `id` is `'123'`
- WHEN `confirmDelete()` is called and `objectStore.deleteObject('client', '123')` succeeds
- THEN `showDeleteDialog.value` is `false` and the router navigates to `{ name: 'ClientList' }`

#### Scenario: confirmDelete without router skips navigation

- GIVEN `options.router` is `null` and `id` is `'123'`
- WHEN `confirmDelete()` is called and the store succeeds
- THEN `showDeleteDialog.value` is `false` and no router navigation occurs

#### Scenario: confirmDelete exposes error on failure

- GIVEN `objectStore.deleteObject` throws with `{ message: 'Forbidden' }`
- WHEN `confirmDelete()` is called
- THEN `error.value` is `'Forbidden'` and no navigation occurs

#### Scenario: confirmDelete handles store returning false

- GIVEN `objectStore.deleteObject` returns `false` (soft failure)
- WHEN `confirmDelete()` is called
- THEN `error.value` is set to the store error message or `'Failed to delete'` and `showDeleteDialog.value` remains unchanged

---

### Requirement: error state management

`useDetailView` SHALL expose an `error` ref (initially `null`) for non-validation errors. Both `onSave` and `confirmDelete` SHALL clear `error` at the start of each call. The consumer uses this ref to display error banners or toasts.

#### Scenario: error is cleared before each operation

- GIVEN `error.value` is `'Previous error'`
- WHEN `onSave(formData)` or `confirmDelete()` is called
- THEN `error.value` is reset to `null` before the async operation begins

#### Scenario: error is set on unexpected failure

- GIVEN `objectStore.saveObject` throws a non-422 error with message `'Server error'`
- WHEN `onSave(formData)` is called
- THEN `error.value` is `'Server error'`

---

### Requirement: router navigation is optional

Router navigation after create and delete operations SHALL only occur when `options.router` is provided. When `options.router` is `null` or `undefined`, the composable SHALL skip all `router.push()` calls silently, allowing consumers to handle navigation themselves or use the composable without Vue Router.

#### Scenario: no router provided — create succeeds without navigation

- GIVEN `options.router` is `undefined` and `isNew` is `true`
- WHEN `onSave({ name: 'Acme' })` succeeds and returns `{ id: '456' }`
- THEN no navigation occurs and the function returns the saved object

#### Scenario: no router provided — delete succeeds without navigation

- GIVEN `options.router` is `undefined`
- WHEN `confirmDelete()` succeeds
- THEN `showDeleteDialog.value` is `false` and no navigation occurs

---

### Requirement: return value contract

`useDetailView` (new API) SHALL return an object with exactly these properties: `object` (computed), `loading` (computed), `isNew` (computed), `editing` (ref), `saving` (ref), `showDeleteDialog` (ref), `error` (ref), `validationErrors` (ref), `onSave` (async function), `confirmDelete` (async function). No additional properties SHALL be added without a spec update.

#### Scenario: all return properties are present

- GIVEN `useDetailView('client', '123')` is called
- WHEN the composable returns
- THEN the returned object has exactly the keys: `object`, `loading`, `isNew`, `editing`, `saving`, `showDeleteDialog`, `error`, `validationErrors`, `onSave`, `confirmDelete`

---

### Requirement: backward compatibility with legacy API

When the first argument is an object or absent, `useDetailView` SHALL delegate to the legacy implementation (`useLegacyDetailView`). The legacy API returns `objectData`, `editing`, `loading`, `saving`, `showDeleteDialog`, `error`, `load`, `save`, `confirmDelete`, `executeDelete`. This ensures existing consumers are not broken.

#### Scenario: zero-argument call returns legacy shape

- GIVEN existing code calls `useDetailView()` with no arguments
- WHEN the composable returns
- THEN the returned object has keys: `objectData`, `editing`, `loading`, `saving`, `showDeleteDialog`, `error`, `load`, `save`, `confirmDelete`, `executeDelete`

#### Scenario: object-argument call delegates to legacy

- GIVEN existing code calls `useDetailView({ objectType: 'client', fetchFn, saveFn, deleteFn })`
- WHEN the composable returns
- THEN the returned object has the legacy shape with `objectData`, `load`, `save`, `confirmDelete`, `executeDelete`

#### Scenario: legacy confirmDelete shows dialog

- GIVEN the legacy API is active
- WHEN `confirmDelete()` is called
- THEN `showDeleteDialog.value` is set to `true` (dialog visibility toggle, not an actual delete)

#### Scenario: legacy executeDelete performs the delete

- GIVEN the legacy API is active and `options.deleteFn` is provided
- WHEN `executeDelete('123')` is called and the delete succeeds
- THEN `showDeleteDialog.value` is set to `false` and `options.onDeleted` callback is invoked if provided

---

### Requirement: Options API compatibility

`useDetailView` SHALL work correctly when called inside the `setup()` function of an Options API component, since consumer apps use both Options API and Composition API. The composable relies only on `ref`, `computed`, `watch`, `isRef`, and `onMounted` from Vue, all of which are valid inside `setup()`.

#### Scenario: composable works in Options API setup()

- GIVEN a component uses the Options API with a `setup(props)` function
- WHEN `useDetailView('client', props.id, { router })` is called inside `setup()`
- THEN the returned refs and functions are usable as return values from `setup()` and are reactive in the template

---

## Current Implementation Status

**Already implemented — all requirements are fulfilled:**

- **File**: `src/composables/useDetailView.js`
- **objectStore integration**: Connects to `useObjectStore()` internally. `object` computed ref reads from `objectStore.getObject(objectType, idRef.value)`. Returns `{}` when `isNew`. `loading` computed from `objectStore.loading[objectType]`.
- **Id normalization**: Accepts both plain strings and Vue refs via `isRef()` check. Plain strings are wrapped in `ref()`.
- **Auto-fetch**: `onMounted(() => fetchIfNeeded(idRef.value))` fetches when id is not `'new'`, `null`, `undefined`, or `''`. `watch(idRef, ...)` re-fetches on id changes.
- **Save operation**: `onSave(formData)` handles create (no id) and update (with id). On create with `detailRouteName`, navigates via `router.push`. On update, sets `editing = false` and re-fetches. On 422, populates `validationErrors`. On `null` result from store, reads `objectStore.errors`. `saving` ref managed via try/finally.
- **Delete operation**: `confirmDelete()` calls `objectStore.deleteObject()`. On success, hides dialog and navigates to `listRouteName`. On `false` result, reads store error. On thrown error, sets `error.value`.
- **Backward compatibility**: First-arg type check delegates to `useLegacyDetailView()` for object/absent arguments. Legacy API preserved with `objectData`, `load`, `save`, `confirmDelete` (shows dialog), `executeDelete` (performs delete).

**Return values (new API):** `object`, `loading`, `isNew`, `editing`, `saving`, `showDeleteDialog`, `error`, `validationErrors`, `onSave`, `confirmDelete`

**Return values (legacy API):** `objectData`, `editing`, `loading`, `saving`, `showDeleteDialog`, `error`, `load`, `save`, `confirmDelete`, `executeDelete`

## Standards & References

- Vue 3 Composition API (`ref`, `computed`, `isRef`, `watch`, `onMounted`)
- Vue Router integration for navigation (`router.push`)
- HTTP 422 validation error pattern
- Pinia store (`useObjectStore`) for state management

## Specificity Assessment

- **Specific enough to implement?** Yes — fully implemented with clear scenarios for all operations.
- **Covered by requirements:** objectStore integration, id normalization, auto-fetch, loading state, edit mode, save with validation, saving state, 422 errors, delete flow, error management, router optionality, return contract, backward compatibility, Options API compatibility.
