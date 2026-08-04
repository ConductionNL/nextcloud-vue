# useCommandPalette

The public registration API for [`CnCommandPalette`](../../components/cn-command-palette.md). Callable from `created()` / `mounted()` / any method — this composable follows the library's Vue 2.7 Options-API convention (a plain factory function backed by a `Vue.observable` module singleton), not a Composition-API-only `setup()` hook.

```js
import { useCommandPalette } from '@conduction/nextcloud-vue'

export default {
  mounted() {
    this._cmdPalette = useCommandPalette()
    this._cmdPalette.register({
      id: 'my-app.create-invoice',
      title: 'Create invoice',
      section: 'Actions',
      keywords: ['new', 'factuur'],
      run: () => this.$router.push({ name: 'invoice-create' }),
    })
  },
  beforeDestroy() {
    this._cmdPalette.unregister('my-app.create-invoice')
  },
}
```

## Signature

```js
useCommandPalette(registry?)
```

| Param | Type | Description |
|-------|------|-------------|
| `registry` | `?object` | Override registry — test isolation, or a deliberately separate palette instance. Defaults to the shared singleton every no-arg call reads. |

Returns:

| Field | Type | Description |
|-------|------|-------------|
| `state` | `{isOpen: boolean}` | Shared, reactive open/close state. Mutate `state.isOpen` directly, or use `open()`/`close()`/`toggle()`. |
| `commands` | `{items: object[]}` | Reactive snapshot of the registered command list — `CnCommandPalette` reads this for its "actions" source. |
| `register(entry)` | `(object) => object` | Register (or upsert) a command. See below for the descriptor shape. |
| `unregister(id)` | `(string) => boolean` | Remove a previously registered command. Returns `true` if one was removed. |
| `open()` | `() => void` | Open the palette. |
| `close()` | `() => void` | Close the palette. |
| `toggle()` | `() => void` | Toggle open/closed — what the built-in Ctrl/Cmd+K listener calls. |
| `registry` | `object` | The underlying registry instance (the resolved `registry` param, or the shared default). |

## Command descriptor

```ts
{
  id: string,          // stable id — re-registering the same id upserts
  title: string,       // human-readable label (already translated) — the primary ranked field
  section?: string,     // section label the palette groups this under (default: "Actions")
  keywords?: string[],  // extra ranked search terms beyond the title
  icon?: string,        // MDI icon name resolved against CnIcon's ICON_MAP
  order?: number,       // idle-list ordering hint, lower sorts first (default: 100)
  run: () => void,       // REQUIRED — invoked when the command is activated
}
```

## Shared, app-wide state

Both `state` and (for the default registry) `commands` are module singletons: a command registered by one component and an "Open command palette" button rendered by an unrelated component both operate on the SAME palette. Registering the same `id` twice **upserts** (last registration wins, no error) rather than throwing — commands are typically registered/unregistered from page-scoped components' own lifecycle hooks and can legitimately re-register across a route change (e.g. a "Create new" command whose `run` closes over the current page's store).

## Test isolation

Pass an explicit registry (from `createCommandRegistry()`, importable from `@conduction/nextcloud-vue/src/commandPalette/registry.js`) to avoid polluting the shared singleton across test files:

```js
import { createCommandRegistry } from '@conduction/nextcloud-vue/src/commandPalette/registry.js'

const registry = createCommandRegistry()
const cp = useCommandPalette(registry)
cp.register({ id: 'test-only', title: 'Test only', run: () => {} })
```

Note `state.isOpen` is **not** registry-scoped — reset it (`useCommandPalette().state.isOpen = false`) in `afterEach` if a test opens the palette.
