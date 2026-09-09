# Design: index columns per scope

## Component and surface

`CnIndexPage` (`src/components/CnIndexPage/`) and the `folderSidebar` block
of the manifest v2 schema (`src/manifest/schema/`).

Kind: code, plus a schema extension consumed as config by apps.

## Manifest shape

Each `folderSidebar.scopes[]` entry (a folder) gains optional keys:

```json
{
  "id": "permit",
  "label": "Permits",
  "filter": { "caseType": "permit" },
  "columns": ["identifier", "requester", "deadline", "status"],
  "defaultSort": { "key": "deadline", "order": "asc" },
  "searchFields": ["identifier", "requester", "location"]
}
```

`columns` accepts the same values as `config.columns` (a key or a column
object). When the sidebar derives its folders from a schema (a
`groupBy` over `caseType` rows), the same three keys may sit on the row object
under `x-index` so a case type record can carry its own list layout. That
lookup is a second source, read only when the folder declares nothing.

## Resolution in CnIndexPage

1. Active scope from the route (`?scope=permit`), as `folderSidebar` already
   resolves it.
2. `columns`, `defaultSort`, `searchFields`: scope value, else page value.
3. Changing scope re-derives the three and refetches with the scope's sort.
4. The column chooser, when present, starts from the scope's columns. A saved
   view stores the scope id so its columns apply to the right list.

## Search fields

`searchFields` limits `_search` to the listed keys by passing them as the
existing search-fields parameter to the object store. When absent, the page's
search behaviour is unchanged.

## Alternatives considered

- One index page per case type: rejected, dossiq has 20 types and ADR-097
  limits nav entries.
- Columns only in saved views: rejected, an admin needs a default the desk
  does not have to build.
