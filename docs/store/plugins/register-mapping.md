# registerMappingPlugin

Adds actions and state for fetching OpenRegister registers and their schemas. Used primarily by [`CnRegisterMapping`](../../components/cn-register-mapping.md) to populate register/schema selects in admin settings.

## Usage

```js
import { createObjectStore, registerMappingPlugin } from '@conduction/nextcloud-vue'

const useMyStore = createObjectStore('myapp', {
  plugins: [registerMappingPlugin()],
})

const store = useMyStore()

await store.fetchRegisters()          // fetches with `_extend[]=schemas` by default

store.registerOptions                 // [{ label, value }] — NcSelect options
store.schemaOptions('5')              // [{ label, value }] for register id 5

// Lazy-fetch schemas for a specific register (cached after first call)
await store.fetchSchemasForRegister(5)
```

## State

| Property | Type | Description |
|----------|------|-------------|
| `registers` | `Array` | All registers returned by OpenRegister |
| `registerSchemas` | `{ [registerId: string]: Array }` | Schemas keyed by register ID (cached) |
| `registersLoading` | `boolean` | |
| `registersError` | `string \| null` | Last error message |

## Getters

| Getter | Returns | Description |
|--------|---------|-------------|
| `getRegisters` | `Array` | Raw register list |
| `isRegistersLoading` | `boolean` | |
| `getRegistersError` | `string \| null` | |
| `registerOptions` | `{ label, value }[]` | Registers mapped to NcSelect options. `label` = `title \|\| slug \|\| "Register <id>"`; `value` = stringified ID. |

## Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `fetchRegisters` | `(withSchemas = true) => Promise<Array>` | GET `/apps/openregister/api/registers`. When `withSchemas` (default), adds `?_extend[]=schemas` and caches each register's schemas into `registerSchemas` keyed by register ID. |
| `fetchSchemasForRegister` | `(registerId) => Promise<Array>` | Returns cached schemas if present, else inspects the in-memory register list, else falls back to GET `/apps/openregister/api/registers/<id>?_extend[]=schemas`. Filters out any schema entries without an `id`. |
| `schemaOptions` | `(registerId) => { label, value }[]` | Synchronously maps cached schemas for a register to NcSelect options. Same label/value rules as `registerOptions`. |
| `clearRegisterMapping` | `() => void` | Reset all plugin state. |

## Notes

- URLs are built via the `prefixUrl` helper from [`build-headers`](../../utilities/build-headers.md).
- Unlike the other sub-resource plugins, errors here are stored as plain strings (not `ApiError` objects).
- `schemaOptions` is declared as an *action*, not a getter — call it as `store.schemaOptions(id)`.
