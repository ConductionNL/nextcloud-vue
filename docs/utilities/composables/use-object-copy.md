# useObjectCopy

Copy an OpenRegister object with the links it has, in one request.

A copy that takes links along touches the new object, relation rows and other objects' reference arrays. From the browser that is a dozen requests, and a closed tab leaves a half-linked copy, so the copy is one `POST /apps/openregister/api/objects/{register}/{schema}/{id}/copy` carrying the new name and the ticked link kinds. The composable also reads what the source is linked to, for the copy dialog's list. `CnCopyDialog`, `CnMassCopyDialog` and `CnIndexPage` use it; call it yourself for a custom copy.

```js
const copier = useObjectCopy()
const source = { register: 'stack', schema: 'application', id: 'A1' }
if (await copier.available(source)) {
  const links = await copier.links(source, ['incoming', 'relationRows'])
  const { object, links: outcome } = await copier.copy(source, 'Zaaksysteem X (kopie)', ['incoming'])
}
```

## Link kinds

| Kind | Read from | A copy |
|------|-----------|--------|
| `relationRows` | `.../{id}/relation-rows` | re-creates the source's relation rows on the copy |
| `incoming` | `.../{id}/used` | adds the copy next to the source in every array-valued reference that points at the source; a single-valued reference is never moved |
| `files` | `.../{id}/files` | copies the attached files |

## API

`useObjectCopy({ apiBase })` takes the object API base (default `/apps/openregister/api/objects`) and returns the three functions below.

| Function | Returns |
|----------|---------|
| `links(source, include)` | `{ [kind]: { titles, total } }` for the included kinds only (first ten titles). A kind that cannot be read counts as 0. |
| `copy(source, name, include, overrides?)` | `{ object, links }`: the new object and, per link, `{ kind, id?, title?, ok, reason? }`. Throws with a 404 or 405 response when the server has no copy endpoint. |
| `available(source)` | `false` on a 404 or 405 from the copy endpoint, `true` otherwise. |

`COPY_LINK_KINDS` lists the kinds and `copyKindsOf(include)` keeps the known ones, once each.

## Without the server endpoint

OpenRegister's copy endpoint is its own change. Until it exists the dialogs show the link list read-only with a note, and copy the fields only, in the browser, as before.
