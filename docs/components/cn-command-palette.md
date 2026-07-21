# CnCommandPalette

A Ctrl/Cmd+K keyboard-first command palette, anchored **once** in `@conduction/nextcloud-vue` so every consuming app inherits it — the same pattern that anchored `expectAccessible` in the library instead of every app hand-rolling accessibility checks (see [Testing → Accessibility](../testing/accessibility.md)).

Aggregates three pluggable sources into one ranked, sectioned list:

- **navigation** — every `manifest.menu` entry (recursively, one level of `children`, captions excluded), so "jump to page" exists with zero app wiring.
- **actions** — commands an app registers declaratively via [`useCommandPalette()`](../utilities/composables/use-command-palette.md).
- **objects** — live OpenRegister search via the `objectSearch` prop. Wire it with [`createObjectSearchSource`](../utilities/create-object-search-source.md), which wraps `useObjectStore().fetchCollection(type, { _search, _limit })` — the SAME call `CnIndexPage` / `CnSearchPage` already use — with debouncing and stale-result discarding.

Keyboard: `Ctrl`/`Cmd` + the configured `shortcut` (default `k`) opens; `Escape` closes; `ArrowUp`/`ArrowDown` move the active option; `Enter` activates it. Focus never leaves the text input — the active option is tracked via `aria-activedescendant` (the WAI-ARIA combobox pattern), not by moving DOM focus onto each result row.

## Zero-config mount via CnAppRoot

The library's app shell (`CnAppRoot`) mounts the palette for you, opt-in and off by default:

```vue
<CnAppRoot :manifest="manifest" app-id="myapp" :command-palette="true" />
```

`true` gives you navigation + actions with no further wiring. Pass an object to override any `CnCommandPalette` prop — most commonly to wire the objects source:

```vue
<CnAppRoot
  :manifest="manifest"
  app-id="myapp"
  :command-palette="{ objectSearch: myObjectSearchSource.search }" />
```

```js
import { useObjectStore, createObjectSearchSource } from '@conduction/nextcloud-vue'

const myObjectSearchSource = createObjectSearchSource({
  store: useObjectStore(),
  types: ['myapp-invoice', 'myapp-customer'],
  resolveResult: (obj, type) => ({
    title: obj.title,
    subtitle: type,
    route: { path: `/${type}/${obj.id}` },
  }),
  router: myRouter,
})
```

## Standalone mount

Any app can mount `CnCommandPalette` directly instead of going through `CnAppRoot`'s `commandPalette` prop — useful for finer control over placement or props.

```vue
<CnCommandPalette
  :manifest="manifest"
  :router="$router"
  app-id="myapp"
  :object-search="myObjectSearchSource.search" />
```

## Registering actions

From anywhere in the app — a page component, a toolbar button, a store plugin:

```js
import { useCommandPalette } from '@conduction/nextcloud-vue'

export default {
  mounted() {
    this._cmdPalette = useCommandPalette()
    this._cmdPalette.register({
      id: 'myapp.create-invoice',
      title: 'Create invoice',
      section: 'Actions',
      keywords: ['new', 'factuur'],
      icon: 'Plus',
      run: () => this.$router.push({ name: 'invoice-create' }),
    })
  },
  beforeDestroy() {
    this._cmdPalette.unregister('myapp.create-invoice')
  },
}
```

See [`useCommandPalette`](../utilities/composables/use-command-palette.md) for the full registration API.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `manifest` | Object | `null` | Reactive app manifest. `manifest.menu` becomes the navigation source. |
| `router` | Object | `null` | vue-router instance, used to resolve navigation results (`router.push({ name, query })`, matching `CnAppNav`'s own resolution). |
| `objectSearch` | Function | `null` | `async (query) => resultItems[]` — the objects source. See `createObjectSearchSource`. |
| `objectSearchDebounce` | Number | `200` | Debounce window (ms) before `objectSearch` fires after typing settles. Navigation/action results are unaffected — they're synchronous. |
| `shortcut` | String | `'k'` | The key combined with Ctrl/Cmd that opens the palette. Case-insensitive. |
| `disableShortcut` | Boolean | `false` | Disable the built-in global keydown listener — drive `open()`/`close()`/`toggle()` yourself via `useCommandPalette()`. |
| `appId` | String | `null` | Namespaces the optional local recency/frequency boost (`localStorage`-only). Omit to disable the boost. |
| `navigationSection` | String | `'Navigate'` (translated) | Section label for navigation results. |
| `placeholder` | String | `'Type a command or search…'` (translated) | Input placeholder / accessible name. |
| `label` | String | `'Command palette'` (translated) | Accessible name for the dialog, combobox, and listbox — also the `NcDialog` header text. |
| `commandRegistry` | Object | `null` | Override registry (test isolation, or a deliberately separate palette instance). Defaults to the shared singleton every `useCommandPalette()` call reads. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `select` | The activated result item | Emitted just before a result's `run()` fires. |

## Ranking

Results rank by match tier, highest first: an exact title match beats a word-prefix match beats a fuzzy subsequence match. Sections are ordered by their best-ranked entry; entries within a section keep that order. See `src/utils/commandPaletteRanking.js` for the pure scoring implementation (not part of the public API surface — used internally by the component).

## Recency (optional, local-only)

When `appId` is set, activating a result nudges its rank on future opens via a small, bounded boost persisted to `localStorage` — never enough to let a fuzzy match outrank an exact one. There is no server-side / cross-device sync; that's a legitimate follow-up (mirroring `CnSupportDialog`'s own `localStorage` fallback tier) but not required for the feature to be useful.

## Accessibility

Built on the real `NcDialog` (focus trap + Escape + backdrop-click handling) with a hand-authored WAI-ARIA 1.2 combobox: the input carries `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls` (pointing at the listbox), and `aria-activedescendant` (pointing at the active `role="option"` row); the result list carries `role="listbox"`; a visually-hidden `aria-live="polite"` region announces the result count on every keystroke. Verified with `expectAccessible()` in both the idle (open, empty-query) and results states — see `tests/a11y/CnCommandPalette.a11y.spec.js`. Uses only Nextcloud CSS variables (`--color-*`, `--border-radius`), so it renders correctly in both light and dark theme with no hardcoded colours.

## Opt-in by design

`CnAppRoot`'s `commandPalette` prop defaults to `false` — existing apps are completely unaffected until they explicitly enable it, matching the `aiCompanion` / `supportDialog` opt-in convention.
