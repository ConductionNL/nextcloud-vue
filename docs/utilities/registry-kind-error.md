# RegistryKindError

`RegistryKindError` is thrown by `CnAppRoot` when a registry entry
declares an unrecognised `kind` value. It carries the offending key and
the bad kind so consumers can surface a friendly message.

## Import

```js
import { RegistryKindError } from '@conduction/nextcloud-vue'
```

## Shape

```ts
class RegistryKindError extends Error {
    name: 'RegistryKindError'
    registryKey: string    // the key in the registry that had the bad kind
    unknownKind: string    // the unrecognised kind value
}
```

## When is it thrown

`CnAppRoot` walks the customComponents registry once at mount and
validates each entry's `kind`. Recognised kinds are:

- `widget`
- `modal`
- `page`
- `form-field`
- `cell-renderer`

An entry with any other `kind` (typo, dropped field, or kind from a
newer library version the host hasn't been upgraded to) raises this
error during mount, surfacing the misconfiguration immediately
rather than failing later inside `CnPageRenderer` slot dispatch with
an opaque "no component found" message.

## Example

```js
try {
    new Vue({ render: h => h(App, {
        props: { customComponents: { foo: { kind: 'widgit', component: Foo } } },
    }) }).$mount('#content')
} catch (err) {
    if (err instanceof RegistryKindError) {
        console.error(
            `Registry entry "${err.registryKey}" uses unknown kind "${err.unknownKind}".`,
        )
    } else {
        throw err
    }
}
```

## Spec

- REQ-MVR-002 — manifest-v2-renderer registry validation
