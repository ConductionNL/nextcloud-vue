# Design: scoped-theme-applier

## Context

nldesign's `app-token-set-selection` spec (status: in-progress, this repo's
`../../../nldesign/openspec/specs/app-token-set-selection/spec.md`) fixes the server-side
contract this change implements against:

- Token assets: `GET` (session-cookie, no controller) at
  `generateFilePath('nldesign', 'css', 'tokens/<id>.css')` — a static, flat `:root { }` CSS file
  (base/light only; dark variants use an unrelated `@media (prefers-color-scheme: dark)` shape
  and are explicitly out of the nldesign contract's scope).
- Catalogue: `GET /api/token-sets` (`#[NoAdminRequired]`) → `{ tokenSets: [{ id, name,
  design_system, theming: { primary_color, background_color, logo? }, wcagLevel }] }`.
- Contrast: `POST /api/contrast/evaluate` (`#[NoAdminRequired]`) → `{ results: [{ name, ratio,
  threshold, level, pass, unevaluated? }] }` — facts only, no `blocked`/`allowed` verdict field
  ever exists in the response (nldesign's own policy: selecting a catalogue entry is always
  warn-only, never blocked).
- Scope attribute: `data-nldesign-theme-scope="<scopeId>"` — **owned by nldesign** (the design
  system), value-bearing so more than one differently-scoped surface can coexist on one page.
  `<scopeId>`'s value is the *consuming* app's concern; nldesign only requires the attribute
  exists on the scope root.
- Selector-rewrite rule: `:root` → `[data-nldesign-theme-scope="<scopeId>"]`, a 1:1 selector-
  prefix transform. A consumer MUST verify the fetched CSS is exactly one flat `:root { }` block
  with no at-rules and no other selector before rewriting, and MUST inject nothing (degrade to
  default styling) if it is not — never a partial rewrite.

OpenBuild already built and shipped exactly this rewriter once, locally, under
`data-openbuild-theme-scope` (`openbuild/src/composables/useAppTheme.js`, spec
`nldesign-theme-selection` REQ-NTS-003). The nldesign contract above promotes the *design*
OpenBuild proved out into a design-system-owned name, which means it can now live once, shared,
in `nextcloud-vue` instead of being reinvented per leaf app. This change is that port + the
`CnAppRoot` wiring + the manifest-schema field that makes `runtime.theme` a first-class,
validated part of the v2 manifest.

## Goals / Non-Goals

**Goals:**
- One shared composable, `useScopedTheme()`, implementing the nldesign scoped-application
  contract exactly (fetch → verify-flat-`:root` → rewrite → inject → teardown), reusable by any
  `nextcloud-vue` consumer.
- `listTokenSets()` / `evaluateContrast()` thin wrappers so a leaf picker (OpenBuild's, or any
  future one) never re-implements WCAG math or nldesign's discovery/merge logic.
- `CnAppRoot` consumes `manifest.runtime.theme` automatically — the fleet-wide "zero per-app
  code" consumption path the task calls for.
- `runtime.theme` promoted into `app-manifest-v2.schema.json` as a documented, validated field.
- Progressive enhancement is a hard requirement throughout: nldesign absent, unreachable, or
  serving non-conformant CSS never throws and never blocks the app shell — it degrades to
  default (unscoped) styling with at most a `console.warn`.

**Non-Goals:**
- nldesign's endpoints themselves — already spec'd (`app-token-set-selection`), treated here as
  fixed.
- OpenBuild's picker UI (`ThemePickerDialog`, its fallback tiers, its `checkThemeContrast.js`
  fate) — OpenBuild's own follow-up change, informed by this one.
- Deleting OpenBuild's local `useAppTheme.js` — happens in OpenBuild's repo, after OpenBuild
  bumps its `@conduction/nextcloud-vue` dependency to a beta containing this change (see
  Reintegration below). Not a file this change touches.
- Scoped dark-mode application — explicitly out of scope in the nldesign contract itself; the
  composable only ever targets base/light `css/tokens/<id>.css`.
- Any change to `CnPageRenderer` — the scope lives at the `CnAppRoot` container level (one
  managed `<style>` per app instance), not per page; no page-level renderer change is needed.

## Composable API Surface

`src/composables/useScopedTheme.js`:

```js
export const SCOPE_ATTR = 'data-nldesign-theme-scope'   // exported so consumers can bind it declaratively

export function useScopedTheme(opts = {}) {
  // opts.client — axios-like injection (tests)
  // opts.doc    — document injection (tests / SSR safety)
  // opts.warn   — console.warn injection (tests)
  // opts.appSlug — nldesign's own Nextcloud app id, default 'nldesign' (URL-building only)
  return {
    apply,             // (manifest, scopeId) => Promise<boolean>
    teardown,          // (scopeId) => void
    fetchTokenCss,      // (tokenSet) => Promise<string|null>  — session-cached, exposed for tests
    listTokenSets,      // () => Promise<TokenSetSummary[]>     — [] on any failure, never throws
    evaluateContrast,   // (candidates, background) => Promise<ContrastResult[]|null> — null on failure
  }
}

// Pure, exported for unit testing in isolation (ported byte-for-byte in spirit from
// OpenBuild's rewriteRootScope, renamed scope target only).
export function rewriteRootScope(css, scopeSelector) { /* … */ }

// Test helper — clears the module-level session cache (mirrors useAppTheme's clearThemeCache).
export function clearScopedThemeCache() { /* … */ }
```

### `apply(manifest, scopeId)`

Mirrors OpenBuild's `useAppTheme().apply()` line for line, retargeted at the nldesign contract:

1. `teardown(scopeId)` first (idempotent re-apply).
2. Read `theme = manifest?.runtime?.theme`. No-op (return `false`) when `theme` is falsy,
   `theme.source !== 'nldesign'`, `theme.tokenSet` is falsy, `scopeId` is falsy, or there is no
   `document` (SSR-safe).
3. `fetchTokenCss(theme.tokenSet)` — session-cached `Map`, `GET
   generateFilePath('nldesign', 'css', 'tokens/<tokenSet>.css')`. `null` on any fetch failure
   (404, network, nldesign absent) → `warn()` once, return `false`. Never throws.
4. `rewriteRootScope(css, '[data-nldesign-theme-scope="<scopeId>"]')`. `null` when the CSS is
   not exactly one flat `:root { }` block (at-rules, nesting, other selectors) → `warn()` once,
   return `false`. This is the bail-and-degrade rule — partial rewriting must never happen.
5. Inject exactly one `<style data-nldesign-theme="<scopeId>">` with the rewritten text into
   `doc.head`. Return `true`.

### `teardown(scopeId)`

Removes every `style[data-nldesign-theme="<scopeId>"]` element. Safe to call when nothing was
ever applied (progressive-enhancement no-op).

### `listTokenSets()`

`GET generateUrl('/apps/nldesign/api/token-sets')`. Returns `data.tokenSets` (array) on success.
Returns `[]` on ANY failure — 404 (nldesign not installed/enabled), network error, malformed
response — never throws. A leaf picker calling this can render an empty catalogue exactly as it
would render "no sets yet"; it never has to special-case "nldesign is absent" itself.

### `evaluateContrast(candidates, background)`

`POST generateUrl('/apps/nldesign/api/contrast/evaluate')` with `{ candidates, background }`.
Returns `data.results` (array) on success, `null` on any failure — distinct from
`listTokenSets()`'s `[]` because "no results" and "the check could not run" are different facts
a picker's contrast-preview UI needs to tell apart (e.g. show nothing vs. show a
"couldn't check" note). Never throws, never fabricates a verdict — the response shape it passes
through already carries no `blocked`/`allowed` field per the nldesign contract, and this
composable adds none.

## `CnAppRoot` Wiring

`CnAppRoot.vue`'s root element already carries a static `data-testid="cn-app-root"`. This change
adds a second, declarative attribute binding alongside it:

```html
<NcContent
  :app-name="appDisplayName || (manifest && manifest.name) || appId"
  :data-nldesign-theme-scope="appId"
  data-testid="cn-app-root">
```

This is always present (inert when no theme is applied — an unused `data-*` attribute costs
nothing) rather than imperatively set in `mounted()`, keeping the scope target declarative and
consistent with the rest of the template.

In `setup(props)`, alongside the existing `manifestEditor`/`baseRef` wiring:

```js
const scopedTheme = useScopedTheme()
watch(
  () => (manifestEditor.editing.value ? manifestEditor.source.value : props.manifest)?.runtime?.theme,
  () => scopedTheme.apply(
    manifestEditor.editing.value ? manifestEditor.source.value : props.manifest,
    props.appId,
  ),
  { deep: true, immediate: true },
)
```

Watching through the SAME editor/props branch `cnManifest`'s getter already uses means the
applied theme tracks whichever manifest is currently effective — including OpenBuild's own
in-app live-preview editing session, with no separate wiring needed for that case. `beforeDestroy()`
calls `scopedTheme.teardown(props.appId)` alongside the existing `beforeunload` listener cleanup.

`props.appId` is the scope id — it is already required, already stable for the app's lifetime,
and already used elsewhere in `CnAppRoot` (e.g. `cnAppId` provide, `useAppStatus`), so no new
prop is introduced. Two `CnAppRoot` instances on one page (unusual, but not disallowed) would
naturally get two distinct scopes as long as they have distinct `appId`s, which the existing
`appId` contract already requires for other reasons (route naming, dependency checks).

`CnPageRenderer` is unchanged: the scope attribute and the injected `<style>` live at the
`CnAppRoot` container, which is an ancestor of every page's DOM, so CSS custom properties cascade
down to every page without any page-level involvement.

## Manifest Schema Promotion

`src/schemas/app-manifest-v2.schema.json`'s existing `runtime` object (currently only documents
the `user` sub-object) gains a `theme` property:

```jsonc
"runtime": {
  "type": "object",
  "additionalProperties": true,
  "properties": {
    "user": { /* unchanged */ },
    "theme": {
      "$ref": "#/$defs/runtimeTheme",
      "description": "NL Design System scoped theme selection (scoped-theme-applier). Consumed by CnAppRoot's useScopedTheme wiring, not by the backend."
    }
  }
}
```

New `$defs/runtimeTheme`:

```jsonc
"runtimeTheme": {
  "type": "object",
  "additionalProperties": false,
  "required": ["source", "tokenSet"],
  "description": "A leaf app's NL Design token-set selection, as returned by nldesign's GET /api/token-sets catalogue (app-token-set-selection). Applied by CnAppRoot via useScopedTheme — the ONLY consumer; the backend does not read this field.",
  "properties": {
    "source": {
      "type": "string",
      "enum": ["nldesign"],
      "description": "Theme provider. Closed to 'nldesign' — the only scoped-theme source this schema (and useScopedTheme) currently supports."
    },
    "tokenSet": {
      "type": "string",
      "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      "description": "The nldesign token-set id (a GET /api/token-sets entry's `id`), kebab-case. Resolves the token CSS at css/tokens/<tokenSet>.css."
    },
    "tokenSetName": {
      "type": "string",
      "description": "Optional human-readable name (the matching catalogue entry's `name`), cached at selection time so a picker can display it without a second catalogue fetch."
    },
    "preview": {
      "type": "object",
      "additionalProperties": false,
      "description": "Optional cached swatch preview (the matching catalogue entry's theming colors), for a picker to render a preview chip without re-fetching the catalogue.",
      "properties": {
        "primaryColor": { "type": "string", "description": "Cached theming.primary_color from the catalogue entry." },
        "backgroundColor": { "type": "string", "description": "Cached theming.background_color from the catalogue entry." }
      }
    }
  }
}
```

`version` bumps `2.19.0` → `2.20.0` — a purely additive property, no existing manifest is
affected. No cross-field arithmetic is introduced, so `validateManifestV2()`'s post-schema check
layer needs no new code — plain Ajv `$ref` + `enum` + `pattern` cover the whole field. This keeps
the change out of ADR-032's thin-glue-LOC accounting entirely for the schema half; the composable
and `CnAppRoot` wiring are the change's actual code.

## Reintegration (OpenBuild)

This is a **publishable** library change — it lands as a normal `@conduction/nextcloud-vue` beta
via the existing semantic-release pipeline. It does not, by itself, change OpenBuild's behaviour:
OpenBuild's `src/composables/useAppTheme.js` keeps running exactly as it does today until
OpenBuild's own team:

1. Bumps `@conduction/nextcloud-vue` in OpenBuild's `package.json` to a beta ≥ the one this
   change ships in.
2. Switches OpenBuild's `ThemePickerDialog` (and anywhere else it calls `useAppTheme()`) to the
   shared `useScopedTheme()` — noting the attribute rename
   (`data-openbuild-theme-scope` → `data-nldesign-theme-scope`) is a visible DOM/CSS change for
   any OpenBuild-authored selector that happened to target the old attribute directly.
3. Deletes `openbuild/src/composables/useAppTheme.js` and its test file.

That sequencing (this change ships and publishes FIRST, OpenBuild's bump-and-delete follows) is
deliberate: it means OpenBuild is never left depending on an unpublished nc-vue version, and the
shared composable is proven against nc-vue's own test suite before OpenBuild's only consumer
switches over. Tracked as an open OpenBuild-side follow-up, not a task in this change.

## Risks / Trade-offs

- **Behaviour parity with OpenBuild's shipped applier is load-bearing.** `rewriteRootScope()` is
  ported deliberately close to byte-identical to OpenBuild's proven implementation (only the
  scope-attribute target string changes) specifically to avoid introducing a NEW defensive-CSS
  edge case nldesign's contract doesn't already cover. The Jest tests in this change re-run the
  same bail-on-unsafe-CSS fixtures OpenBuild's own suite already exercises.
- **Watching `runtime.theme` deep, on every manifest identity change**, re-runs `apply()` (a
  network fetch, cached) whenever `props.manifest` changes reference — including ordinary route
  navigation if a consuming app ever swaps the whole manifest object per route (none do today).
  `fetchTokenCss()`'s session cache absorbs the repeat-fetch cost; `apply()`'s own
  `teardown()`-then-reapply keeps the DOM state correct regardless of call frequency.
- **`listTokenSets()` returning `[]` on failure is indistinguishable from "an instance with zero
  configured token sets."** Accepted: a picker UI's job is to render "nothing to pick" either way
  progressive enhancement (design goal) explicitly rules out surfacing "nldesign is broken" as a
  blocking error to an end user selecting a theme.

## Open Questions

- Should `useScopedTheme()` accept an `nldesignAppId` override for a future non-standard install
  (nldesign mounted under a different app id)? Deferred — no known consumer needs it; `opts
  .appSlug` defaults to `'nldesign'` and can be extended non-breaking later if one appears.
- Should `CnAppRoot` expose the applied/pending theme state (e.g. `cnScopedThemeApplied` provide)
  for a descendant to show "theme loading" UI? Deferred — no consumer has asked for it; `apply()`
  already resolves silently and the CSS variables simply become available, matching how the
  instance-wide nldesign theme itself behaves (no loading UI exists for that either).
- Exact final location of the OpenBuild bump-and-delete PR is OpenBuild's own openspec change,
  not tracked here — see Reintegration above.
