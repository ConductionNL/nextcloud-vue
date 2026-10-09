# Group display names

A cached lookup of a Nextcloud group's display name, used by the group cell in
`CnCellRenderer` and by `CnObjectDataWidget`. Imported from
`src/utils/groupAutocomplete.js`.

## Functions

| Function | Returns | What it does |
|----------|---------|--------------|
| `groupDisplayName(gid)` | `string \| null` | The cached name, or `null` when it has not been looked up. Reactive. |
| `loadGroupDisplayName(gid)` | `Promise<string>` | Looks the name up once per page. Concurrent calls for one id share one request. A group it cannot find caches the id. |
| `clearGroupNameCache()` | `void` | Forgets every cached name. |

The name comes from Nextcloud's autocomplete endpoint, which every signed-in
user may call, with `cloud/groups` as the fallback (that one knows ids only).
