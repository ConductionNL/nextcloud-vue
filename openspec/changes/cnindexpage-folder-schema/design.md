# Design: cnindexpage-folder-schema

## Context

`CnIndexPage` (`src/components/CnIndexPage/CnIndexPage.vue`) is an
Options-API component with one `setup(props)` hook. `setup()` calls
`useSelfFetchList(props, getCurrentInstance(), inject)`
(`src/components/CnIndexPage/useSelfFetchList.js`), which, for a
manifest-driven page (`register` + `schema` props, no `objects` prop, no
`entitySource`), computes:

```js
const objectType = `${props.register}-${props.schema}`
```

as a plain string, once, at setup time. It hands that string to
`useListView(objectType, options)` (`src/composables/useListView.js`) and to
`useObjectSubscription(...)`. Neither composable watches its `objectType`
argument; both close over it as a constant for the component's lifetime.
Every fetch, every store lookup (`objectStore.collections[objectType]`,
`.pagination[objectType]`, `.facets[objectType]`) and every live-update
subscription key off that one frozen string.

Folder selection, by contrast, lives in the Options-API half of the same
component: `selectedFolderId` is component data, set by `onFolderSelect()`
and by the `mounted()` deep-link handler, and `folderSidebarFolders()` reads
`this.folderSidebar.folders` (for `source: custom`) or the loaded
`folderRegisterList` (for `source: register`). `onFolderSelect()` today only
ever calls `onFilterEvent()`, which narrows the fetch by
`filterField`/`field` on the *existing* `objectType`.

Nothing here is dossiq-specific: `useSelfFetchList`, `useListView` and
`useObjectSubscription` are the self-fetch path every manifest-driven index
page in the fleet renders, `folderSidebar` shapes are read the same way
regardless of caller, and the JSON manifest schema places no constraint on
what a folder object may carry (`config` is `additionalProperties: true`).

ADR-032 kind: **code**. The manifest side needs no schema change (see
above); the fix is in the component and the two composables it drives.

## Goals / Non-goals

**Goals:**

- A folder may declare `schema` (and, optionally, `register`; it defaults to
  the page's own `register` when the folder stays within the same
  register). Selecting that folder switches the page to that register and
  schema: new columns (schema-driven, per the existing "Schema-Driven Column
  Generation" requirement, until `index-columns-per-scope` also lands),
  fresh fetch, fresh subscription.
- Returning to "All" (`folderId === null`), or to a folder that declares no
  `schema`, restores the page's own `register`/`schema`.
- Every existing `folderSidebar` page (dossiq's `Cases`, its `source:
  register` and `source: files` pages, and any other app's) keeps working
  unchanged, because none of them declares `schema` on a folder today.

**Non-goals:**

- Per-folder `columns`, `defaultSort` or `searchFields`. That is
  `index-columns-per-scope` (nextcloud-vue, B10), a separate change that
  composes with this one: once both ship, a folder can declare `schema` here
  and `columns` there, on the same folder entry. Neither depends on the
  other to ship.
- A per-folder `hidden` key. `CnFolderTree` reads no such key today (it
  renders every entry of `folders[]`), and dossiq's own re-measurement
  concluded that once a folder can carry its own schema, `hidden` is not
  wanted either: the two schemas surface as two real folders under one
  entry, not one shown and one suppressed.
- Deriving folders themselves from a schema's rows and giving each a
  `schema` (`source: register`/`field` folders driven by data). This change
  covers a folder declared in the manifest (`source: custom`); a
  data-derived folder naming a schema per row is a bigger seam and is not
  asked for by any known consumer yet.
- Any change to the CTI, BRP/KvK or KCC-panel work named in dossiq's
  `contacts-domain` (B20, B22). This change only unblocks the folder/schema
  seam.

## Decisions

### D1: `schema` (and optional `register`) on a folder entry

A folder object (`folderSidebar.folders[]` for `source: custom`; the mapped
shape for `source: register`) gains two optional keys:

```json
{ "id": "kvkCompany", "name": "Organisations", "schema": "kvkCompany", "register": "dossiq" }
```

`schema` names the OpenRegister schema slug to load when this folder is
active. `register` is optional; omitted, it defaults to the page's own
`register` prop. A folder without `schema` is unaffected: it keeps filtering
the page's schema exactly as `onFolderSelect()` does today.

No JSON schema change is needed (`config` already accepts arbitrary keys),
but `docs/utilities/validate-manifest-v2.md` and the `folderSidebar` JSDoc on
`CnIndexPage`'s `folderSidebar` prop (`CnIndexPage.vue` around line 1600)
gain the two keys, since they are the only place the vocabulary is written
down today.

### D2: a reactive object type, not a frozen string

The blast radius is the real work here. `useSelfFetchList` must resolve
`objectType` as a `computed()` (or equivalent reactive getter) over
`props.register`, `props.schema`, and the active folder's `register`/`schema`
when one is selected and declares them, instead of interpolating a plain
string once. `CnIndexPage` exposes the active folder's override through a
small reactive ref (e.g. `activeFolderSchema`, written by `onFolderSelect()`
alongside `selectedFolderId`) that `setup()` passes into
`useSelfFetchList` — bridging Options-API state into the Composition-API
call the same way `props` already does.

`useListView(objectType, options)` and `useObjectSubscription(...)` both
currently accept `objectType` as a plain string argument, read once at call
time (`const objectType = objectTypeOrOptions` in `useListView`). Both need
to either accept a ref/getter and re-run their internal `computed()`/`watch`
against it, or `CnIndexPage` needs to re-invoke them when the resolved
object type changes. Re-invoking a composable mid-lifecycle is unusual in
this codebase; the natural shape is for `useListView` to accept
`Ref<string> | (() => string)` in addition to a plain string (backward
compatible: existing callers keep passing a string, which becomes a
constant getter under the hood) and for its internal `computed()`s
(`objects`, `loading`, `pagination`, `facets`) to read through it. The same
treatment applies to `useObjectSubscription`.

A schema switch:

1. Clears the page's local selection and any open dialogs (a row selected
   under the old schema has no meaning under the new one).
2. Re-fetches page 1 under the new `objectType`, sourcing schema-driven
   columns from the newly loaded schema.
3. Re-subscribes for live updates on the new `objectType`; the old
   subscription is torn down. `useObjectSubscription`'s existing epoch
   counter (the pattern noted at its top, openregister#402) is the
   mechanism to extend, not replace.

### D3: composing with `index-columns-per-scope` (B10)

`index-columns-per-scope` gives a folder its own `columns`/`defaultSort`/
`searchFields`, independent of schema. A folder in this change's vocabulary
can carry both sets of keys on the same object once B10 ships:

```json
{ "id": "kvkCompany", "name": "Organisations", "schema": "kvkCompany",
  "columns": ["tradeName", "kvkNumber", "address"] }
```

Until B10 ships, a schema-switching folder falls back to that schema's own
auto-generated columns (the existing schema-driven column generation), which
is correct but not curated. Neither change blocks the other's landing or
archival.

### D4: what a page that declares no folders sees

Nothing. `folderSidebar` stays fully opt-in; `isSelfFetch`'s existing guard
(`props.register && props.schema`, no `objects`, no `entitySource`) is
untouched, and the new resolution path only executes once
`this.folderSidebar` is present and the active folder declares `schema`.

## Declarative-vs-imperative decision (ADR-031)

| behaviour | path | reason |
|---|---|---|
| Declaring a folder's schema | declarative, a manifest key | Same vocabulary as every other `folderSidebar` key. |
| Resolving the active object type | code, `useSelfFetchList` | Cannot be declarative: it reacts to user selection. |
| Re-fetching and re-subscribing on switch | code, `useListView` / `useObjectSubscription` | Existing composables extended, not replaced. |

## Risks / Trade-offs

- This touches the self-fetch path every manifest-driven index page renders.
  The task that first asked for this (`contacts-domain` 2.2) called it out
  explicitly as "a real change with real blast radius" that "should be its
  own openspec change with its own mutation-checked tests." Task 2 below
  keeps that scope: implementation is not part of this proposal.
- A folder that names a `schema` the viewer cannot read fails the same way
  the page-level `schema` prop already fails today (an empty or errored
  list); this change adds no new permission surface.
- Two schemas sharing one page mean two sets of facetable properties, two
  sets of default sort fields, and potentially two different `idField`
  shapes. The resolution in D2 treats each schema's fetch as fully
  independent state, keyed by its own `objectType`, so nothing about one
  schema's shape leaks into the other's.
