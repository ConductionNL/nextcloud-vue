# useScopedTheme

Shared runtime applier for nldesign's scoped theme-application contract (`app-token-set-selection`, "Scoped Application Contract for Base Token CSS"). Fetches an NL Design System token set's base CSS, verifies it is exactly one flat `:root { }` block, rewrites it to a scope-attribute selector, and injects it as one managed `<style>` element scoped to a consuming app's own surface — without repainting the whole Nextcloud instance.

Ports Buildiq's proven, already-shipped `useAppTheme` composable into `@conduction/nextcloud-vue` so any manifest-driven Conduction app can reuse it instead of reimplementing the rewriter. [`CnAppRoot`](../../components/cn-app-root.md) wires it in automatically — see the "Automatic consumption via CnAppRoot" section below for the zero-code path.

## The nldesign contract

- Token assets: `GET` (session-cookie, no controller) at `css/tokens/<tokenSet>.css` — a static, flat `:root { }` CSS file (base/light only).
- Catalogue: `GET /api/token-sets` → `{ tokenSets: [{ id, name, design_system, theming: { primary_color, background_color, logo? }, wcagLevel }] }`.
- Contrast: `POST /api/contrast/evaluate` → `{ results: [{ name, ratio, threshold, level, pass, unevaluated? }] }` — facts only, never a `blocked`/`allowed` verdict.
- Scope attribute: `data-nldesign-theme-scope="<scopeId>"` — owned by nldesign (the design system), so more than one differently-scoped surface can coexist on one page.
- Selector-rewrite rule: `:root` → `[data-nldesign-theme-scope="<scopeId>"]`, a 1:1 selector-prefix transform. A consumer MUST verify the fetched CSS is exactly one flat `:root { }` block with no at-rules and no other selector before rewriting, and MUST inject nothing (degrade to default styling) if it is not — never a partial rewrite.

This composable implements that contract exactly. Progressive enhancement is a hard requirement throughout: nldesign absent, unreachable, or serving non-conformant CSS never throws and never blocks the app shell — it degrades to default (unscoped) styling with at most a `console.warn`.

## Signature

```js
import { useScopedTheme } from '@conduction/nextcloud-vue'

const { apply, teardown, fetchTokenCss, listTokenSets, evaluateContrast } = useScopedTheme(opts)
```

| Argument | Type | Description |
|----------|------|-------------|
| `opts.client` | `AxiosInstance` | Optional axios-like client injection (tests). Defaults to `@nextcloud/axios`. |
| `opts.doc` | `Document` | Optional `document` injection (tests / SSR safety). Defaults to the global `document` when available. |
| `opts.warn` | `Function` | Optional `console.warn` injection (tests). |
| `opts.appSlug` | `string` | nldesign's own Nextcloud app id (URL-building only). Default `'nldesign'`. |

## Return value

| Key | Type | Description |
|-----|------|-------------|
| `apply` | `(manifest, scopeId) => Promise<boolean>` | Fetches, verifies, rewrites, and injects the scoped theme declared by `manifest.runtime.theme`. Resolves `true` when a style was injected, `false` on any no-op or failure. Never throws. |
| `teardown` | `(scopeId) => void` | Removes every managed style element for `scopeId`. Safe to call when nothing was ever applied. |
| `fetchTokenCss` | `(tokenSet) => Promise<string\|null>` | Session-cached raw token CSS fetch. `null` on any failure. Exposed for tests and advanced callers. |
| `listTokenSets` | `() => Promise<Array<object>>` | The nldesign token-set catalogue. `[]` on ANY failure — never throws. |
| `evaluateContrast` | `(candidates, background) => Promise<Array<object>\|null>` | WCAG contrast facts for candidate colors against a background. `null` on any failure — distinct from `listTokenSets()`'s `[]`. Never throws, never fabricates a verdict. |

### Also exported

```js
import { rewriteRootScope, SCOPE_ATTR } from '@conduction/nextcloud-vue/src/composables/useScopedTheme.js'
```

| Export | Type | Description |
|--------|------|-------------|
| `SCOPE_ATTR` | `string` | `'data-nldesign-theme-scope'` — the design-system-owned scope attribute name, exported so consumers can bind it declaratively. |
| `rewriteRootScope` | `(css, scopeSelector) => string\|null` | Pure rewriter: rewrites every flat `:root { }` block to `scopeSelector`. Returns `null` (bail-and-degrade) when the CSS contains anything the rewriter cannot safely scope (at-rules, nesting, non-`:root` selectors). Exported for isolated unit testing. |

## `apply(manifest, scopeId)`

1. Tears down any prior managed style for `scopeId` first (idempotent re-apply).
2. Reads `theme = manifest?.runtime?.theme`. No-ops (`false`) when `theme` is falsy, `theme.source !== 'nldesign'`, `theme.tokenSet` is falsy, `scopeId` is falsy, or there is no `document`.
3. Fetches `css/tokens/<tokenSet>.css` (session-cached). `null` on any fetch failure (404, network, nldesign absent) → warns once, returns `false`.
4. Verifies + rewrites via `rewriteRootScope`. `null` when the CSS is not exactly one flat `:root { }` block → warns once, returns `false` — the bail-and-degrade rule, never a partial rewrite.
5. Injects exactly one `<style data-nldesign-theme="<scopeId>">` into `document.head`. Returns `true`.

## Automatic consumption via CnAppRoot

`CnAppRoot`'s root `<NcContent>` carries `:data-nldesign-theme-scope="appId"`. In `setup()`, `CnAppRoot` watches the effective manifest's `runtime.theme` (deep, immediate — the same editing-vs-prop branch its `cnManifest` provide getter uses) and calls `apply(effectiveManifest, appId)` on every change, including an in-app manifest-editor (ADR-041) live-preview edit. `beforeDestroy()` calls `teardown(appId)`.

This means any app declaring `manifest.runtime.theme` gets scoped theming for free — zero per-app applier code:

```json
{
  "runtime": {
    "theme": {
      "source": "nldesign",
      "tokenSet": "gemeente-blauw",
      "tokenSetName": "Gemeente Blauw",
      "preview": { "primaryColor": "#154273", "backgroundColor": "#FFFFFF" }
    }
  }
}
```

See [`runtime.theme` in the manifest schema](../../architecture/manifest.md) for the full field shape (`$defs/runtimeTheme`, `app-manifest-v2.schema.json`).

## Standalone usage (e.g. a theme-picker dialog)

```js
import { useScopedTheme } from '@conduction/nextcloud-vue'

const { listTokenSets, evaluateContrast, apply, teardown } = useScopedTheme()

// Populate a picker's option list. Renders as an empty catalogue when
// nldesign is absent — never a special-cased error state.
const tokenSets = await listTokenSets()

// Preview a candidate before committing it to the manifest.
const contrastResults = await evaluateContrast(
  [{ name: 'primary', value: '#154273', role: 'text' }],
  '#FFFFFF',
)

// Apply/teardown directly, e.g. for a live preview scoped to a temp id.
await apply({ runtime: { theme: { source: 'nldesign', tokenSet: 'gemeente-blauw' } } }, 'preview-scope')
teardown('preview-scope')
```

## Notes

- **Non-Goal:** scoped dark-mode application — out of scope in the nldesign contract itself; the composable only ever targets base/light `css/tokens/<id>.css`.
- **Caching:** `fetchTokenCss` caches raw CSS per token-set id at module scope for the page lifetime. Repeated `apply()` calls for different scopes with the same `tokenSet` issue only one fetch.
- **No verdict fabrication:** `evaluateContrast()`'s resolved value passes through nldesign's response shape unchanged — it never adds a `blocked`/`allowed`/`verdict` field the underlying response does not itself carry. A consuming picker UI decides what to do with the facts; selecting a catalogue entry is always warn-only, never blocked, per nldesign's own policy.
