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

---

### Requirement: fetch on mount

`useDetailView` SHALL call `objectStore.fetchObject(objectType, id)` in `onMounted` when `isNew` is `false`. The component MUST NOT call `fetchObject` manually.

#### Scenario: existing object is fetched on mount

- GIVEN `id` is `'123'`
- WHEN the component mounts
- THEN `objectStore.fetchObject('client', '123')` is called

#### Scenario: new object is not fetched on mount

- GIVEN `id` is `'new'`
- WHEN the component mounts
- THEN `objectStore.fetchObject` is NOT called

#### Scenario: refetch when id changes

- GIVEN a component is mounted with `id = '123'`
- WHEN `id` changes to `'456'` (route param change without remount)
- THEN `objectStore.fetchObject('client', '456')` is called

---

### Requirement: save operation

`useDetailView` SHALL provide an `onSave(formData)` function. On success it SHALL update the object or redirect. On 422 validation errors it SHALL expose them via `validationErrors`. On other errors it SHALL expose an `error` message.

#### Scenario: save creates new object and redirects

- GIVEN `isNew` is `true` and `options.detailRouteName` is `'ClientDetail'`
- WHEN `onSave({ name: 'Acme' })` is called and the store returns `{ id: '456' }`
- THEN the router navigates to `{ name: 'ClientDetail', params: { id: '456' } }`

#### Scenario: save updates existing object

- GIVEN `isNew` is `false` and `id` is `'123'`
- WHEN `onSave({ name: 'Updated' })` is called and the store succeeds
- THEN `editing.value` is set to `false` and `objectStore.fetchObject('client', '123')` is called to refresh

#### Scenario: save exposes validation errors on 422

- GIVEN the store throws with `status: 422` and `data.errors: { email: 'Already taken' }`
- WHEN `onSave(formData)` is called
- THEN `validationErrors.value` equals `{ email: 'Already taken' }` and no redirect occurs

#### Scenario: saving state is managed

- GIVEN `onSave` is in progress
- WHEN the save is awaited
- THEN `saving.value` is `true` during the call and `false` after it resolves

---

### Requirement: delete operation

`useDetailView` SHALL provide `showDeleteDialog`, `confirmDelete()` to control a delete confirmation flow. On success it SHALL navigate to `options.listRouteName`.

#### Scenario: confirmDelete deletes and navigates

- GIVEN `options.listRouteName` is `'ClientList'` and `id` is `'123'`
- WHEN `confirmDelete()` is called and the store succeeds
- THEN `objectStore.deleteObject('client', '123')` is called and the router navigates to `{ name: 'ClientList' }`

#### Scenario: confirmDelete exposes error on failure

- GIVEN the store throws on delete
- WHEN `confirmDelete()` is called
- THEN `error.value` is set to the error message and no navigation occurs

---

### Requirement: backward compatibility

The existing `useDetailView()` call signature SHALL continue to work. The new `id` and `options` parameters are optional extensions. No existing consumer is broken by this change.

#### Scenario: zero-argument call still works

- GIVEN existing code calls `useDetailView()` with no arguments
- WHEN the enhanced composable is imported
- THEN the call does not throw and returns the same state refs as before (`editing`, `loading`, `saving`, `showDeleteDialog`, `error`)
