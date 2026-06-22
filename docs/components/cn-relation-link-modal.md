# CnRelationLinkModal

Link an existing related object to the current object.

Async-searches a target `register` + `schema` (via
[`CnResourceSelect`](./cn-resource-select.md) in link-mode — `allowCreate`
defaults to `false`, so it behaves as a plain existing-object picker) and, on
confirm, PATCHes a foreign-key field on the current object with the chosen
object's id, saving through `useObjectStore`. Used by `CnDetailPage`'s
declarative relation-link action (`config.relationLinks`).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `'Link related object'` | Modal heading. |
| `selectLabel` | String | `'Search…'` | Accessible label for the picker. |
| `register` | String | — (required) | Target register slug to search. |
| `schema` | String | — (required) | Target schema slug to search. |
| `labelField` | String | `'name'` | Field used as the option label. |
| `allowCreate` | Boolean | `false` | Whether the picker offers inline create-from-search. |
| `currentType` | String | — (required) | Object-type slug (`${register}-${schema}`) of the CURRENT object being patched. |
| `currentObject` | Object | — (required) | The current object (must carry an `id`). |
| `fkField` | String | — (required) | The foreign-key field on the current object to write the chosen id into. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `linked` | `object` | The FK was patched and saved; payload is the updated object. |
| `close` | — | The modal was dismissed (Cancel or after a successful link). |
