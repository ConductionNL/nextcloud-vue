---
status: done
---

# scoped-theme-applier Specification

**OpenSpec changes**: scoped-theme-applier (done — `useScopedTheme` composable implementing
nldesign's scoped-application contract, `CnAppRoot` wiring for `manifest.runtime.theme`, and the
`runtime.theme` field promoted into `app-manifest-v2.schema.json`)

## Purpose

Host the CLIENT-SIDE scoped theming applier for the fleet in `@conduction/nextcloud-vue` — the
shared component/composable library every Conduction app already depends on — rather than in any
single leaf app. nldesign (the NL Design System app) owns the token catalogue, the WCAG contrast
math, and the scoped-application CONTRACT (`app-token-set-selection`); this capability is the one
place that CONTRACT is implemented in JavaScript, so any manifest-driven app gets scoped NL
Design theming from a `manifest.runtime.theme` declaration with zero per-app applier code. This
capability replaces Buildiq's local, first-mover `useAppTheme.js` (which proved the design
under the Buildiq-owned `data-openbuild-theme-scope` attribute) with the design-system-owned
`data-nldesign-theme-scope` attribute nldesign's contract now fixes.

## Requirements

### Requirement: REQ-STA-1 — `useScopedTheme` implements the nldesign scoped-application contract

`useScopedTheme()` MUST export an `apply(manifest, scopeId)` / `teardown(scopeId)` pair that
implements nldesign's published scoped-application contract (`app-token-set-selection`,
"Scoped Application Contract for Base Token CSS") exactly: fetch `css/tokens/<tokenSet>.css` via
`generateFilePath('nldesign', 'css', 'tokens/<tokenSet>.css')`; verify the fetched text is
EXACTLY one flat `:root { }` block with no at-rules and no other selector; when it is, rewrite
`:root` to `[data-nldesign-theme-scope="<scopeId>"]` (a 1:1 selector-prefix transform — no
property name, value, or declaration order altered) and inject the result as exactly one
managed `<style data-nldesign-theme="<scopeId>">` element; when the CSS does not verify, or the
fetch fails for any reason, inject NOTHING and degrade to default (unscoped) styling with at
most one `console.warn` — never a partial rewrite, never a throw. `teardown(scopeId)` MUST
remove every managed style element for that `scopeId` and MUST be safe to call when nothing was
ever applied.

> @e2e exclude library composable — covered by Jest (`tests/composables/useScopedTheme.spec.js`);
> no Playwright app surface exists in this component-library repo.

#### Scenario: Flat `:root` token CSS is rewritten and injected

- GIVEN `manifest.runtime.theme = { source: "nldesign", tokenSet: "gemeente-blauw" }`
- AND `css/tokens/gemeente-blauw.css` fetches as a single flat `:root { --nldesign-color-primary: #154273; }` block
- WHEN `apply(manifest, "petstore")` is called
- THEN exactly one `<style data-nldesign-theme="petstore">` element is present in `document.head`
- AND its content is `[data-nldesign-theme-scope="petstore"] { --nldesign-color-primary: #154273; }`
- AND `apply` resolves `true`

#### Scenario: Non-flat token CSS bails and injects nothing

- GIVEN a fetched token CSS containing an `@media` block (or a non-`:root` selector, or nested
  rules)
- WHEN `apply(manifest, scopeId)` is called
- THEN no `<style>` element is injected
- AND a `console.warn` is emitted naming the token set
- AND `apply` resolves `false`

#### Scenario: Fetch failure degrades silently

- GIVEN `css/tokens/<tokenSet>.css` 404s, or the request fails on the network, or the nldesign
  app is not installed/enabled
- WHEN `apply(manifest, scopeId)` is called
- THEN no `<style>` element is injected
- AND no exception is thrown
- AND `apply` resolves `false`

#### Scenario: Re-applying is idempotent

- GIVEN a scope that already has a managed `<style data-nldesign-theme="<scopeId>">` element
  from a prior `apply()` call
- WHEN `apply(manifest, scopeId)` is called again (e.g. the manifest's `runtime.theme.tokenSet`
  changed)
- THEN the prior managed style element is removed before the new one (if any) is injected
- AND at most one `<style data-nldesign-theme="<scopeId>">` element exists afterward

#### Scenario: Teardown removes the managed style and is safe when nothing was applied

- GIVEN a scope with a managed style element present
- WHEN `teardown(scopeId)` is called
- THEN the element is removed from `document.head`
- WHEN `teardown(scopeId)` is called again with nothing present
- THEN it is a no-op and does not throw

### Requirement: REQ-STA-2 — `listTokenSets()` and `evaluateContrast()` are failure-tolerant fetch wrappers

`useScopedTheme()` MUST expose `listTokenSets()` — `GET` nldesign's `/api/token-sets` catalogue
endpoint, returning the response's `tokenSets` array on success and `[]` on ANY failure (missing
app, network error, non-2xx, malformed body), never throwing — and `evaluateContrast(candidates,
background)` — `POST` nldesign's `/api/contrast/evaluate` endpoint with `{ candidates,
background }`, returning the response's `results` array on success and `null` on any failure,
never throwing and never synthesising a `blocked`/`allowed`/`verdict` field the underlying
nldesign response does not itself carry.

> @e2e exclude library composable — covered by Jest; no Playwright app surface in this repo.

#### Scenario: Catalogue read succeeds

- GIVEN nldesign responds to `GET /api/token-sets` with `{ tokenSets: [{ id: "gemeente-blauw", … }] }`
- WHEN `listTokenSets()` is called
- THEN it resolves to the `tokenSets` array unchanged

#### Scenario: Catalogue read fails silently

- GIVEN nldesign is not installed, or the request fails
- WHEN `listTokenSets()` is called
- THEN it resolves to `[]`
- AND no exception is thrown

#### Scenario: Contrast evaluation passes through facts, never a verdict

- GIVEN nldesign responds to `POST /api/contrast/evaluate` with `{ results: [{ name: "primary",
  ratio: 8.1, threshold: 4.5, level: "AA", pass: true }] }`
- WHEN `evaluateContrast([{ name: "primary", value: "#154273", role: "text" }], "#FFFFFF")` is
  called
- THEN it resolves to that `results` array
- AND the resolved value contains no `blocked`, `allowed`, or `verdict` key anywhere

#### Scenario: Contrast evaluation fails distinguishably from "no results"

- GIVEN nldesign is unreachable
- WHEN `evaluateContrast(candidates, background)` is called
- THEN it resolves to `null` (distinct from an empty array)
- AND no exception is thrown

### Requirement: REQ-STA-3 — `CnAppRoot` applies `manifest.runtime.theme` with zero per-app code

`CnAppRoot` MUST, whenever the effective manifest (the in-app-edit working copy when editing,
`props.manifest` otherwise) declares a `runtime.theme` matching the `runtimeTheme` schema shape,
call `useScopedTheme().apply(effectiveManifest, props.appId)` — using `props.appId` as the scope
id — with no additional prop, slot, or per-consuming-app code required. `CnAppRoot`'s root
element MUST carry `data-nldesign-theme-scope="<appId>"` so the injected scoped CSS has a valid
target. `CnAppRoot` MUST re-apply when the effective manifest's `runtime.theme` changes (e.g. an
in-app theme-picker edit), and MUST call `teardown(appId)` on unmount. A manifest that declares
no `runtime.theme` MUST render identically to before this change (no style element, no behaviour
change).

> @e2e exclude library composable/component — covered by Jest
> (`tests/components/CnAppRoot.spec.js`); consuming-app Playwright coverage for a concrete
> `runtime.theme` manifest is the adopting app's own e2e surface, not this library's.

#### Scenario: Mounting with `runtime.theme` applies the scoped theme

- GIVEN `CnAppRoot` is mounted with `appId="petstore"` and `manifest.runtime.theme = { source:
  "nldesign", tokenSet: "gemeente-blauw" }`
- WHEN the component mounts
- THEN `useScopedTheme().apply()` is called with the manifest and `"petstore"`
- AND the root element carries `data-nldesign-theme-scope="petstore"`

#### Scenario: A manifest with no `runtime.theme` is unaffected

- GIVEN `CnAppRoot` is mounted with a manifest carrying no `runtime.theme`
- WHEN the component mounts
- THEN no `<style data-nldesign-theme="…">` element is injected
- AND rendering is otherwise identical to before this change

#### Scenario: An in-app theme-picker edit re-applies the theme

- GIVEN `CnAppRoot` is mounted and editing via the in-app manifest editor (ADR-041)
- WHEN the editing working copy's `runtime.theme.tokenSet` changes
- THEN `useScopedTheme().apply()` is called again with the updated working-copy manifest

#### Scenario: Unmounting tears down the scoped theme

- GIVEN `CnAppRoot` is mounted with a `runtime.theme` applied
- WHEN the component is destroyed
- THEN `useScopedTheme().teardown(appId)` is called

### Requirement: REQ-STA-4 — `runtime.theme` is a documented, validated field of the v2 manifest schema

`app-manifest-v2.schema.json` MUST declare `runtime.theme` as `$defs/runtimeTheme`: an object
with `additionalProperties: false`, required `source` (closed enum `["nldesign"]`) and required
`tokenSet` (kebab-case pattern, matching a `GET /api/token-sets` entry's `id`), and optional
`tokenSetName` (string) and `preview` (`{ primaryColor?, backgroundColor? }`, both strings,
`additionalProperties: false`). The schema `version` MUST bump one sequential minor (shipped as
2.20.0 → 2.21.0 — the beta-HEAD baseline had already advanced past the 2.19.0 → 2.20.0 originally
planned in design.md). A manifest WITHOUT `runtime.theme` MUST validate exactly as before this
change.

> @e2e exclude unit-tested via Jest (schema/validator specs) — no browser surface.

#### Scenario: A well-formed `runtime.theme` validates

- GIVEN a v2 manifest with `runtime.theme = { source: "nldesign", tokenSet: "gemeente-blauw",
  tokenSetName: "Gemeente Blauw", preview: { primaryColor: "#154273", backgroundColor: "#FFFFFF" } }`
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: true, errors: [] }`

#### Scenario: An unknown `source` is rejected

- GIVEN `runtime.theme = { source: "custom", tokenSet: "x" }`
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: false }` with an error pointing at `runtime.theme.source`

#### Scenario: A non-kebab-case `tokenSet` is rejected

- GIVEN `runtime.theme = { source: "nldesign", tokenSet: "Gemeente_Blauw" }`
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: false }` with an error pointing at `runtime.theme.tokenSet`

#### Scenario: An unknown key on `runtime.theme` is rejected

- GIVEN `runtime.theme = { source: "nldesign", tokenSet: "x", extra: true }`
- WHEN `validateManifestV2()` runs
- THEN it MUST return `{ valid: false }` — `runtimeTheme` is closed
  (`additionalProperties: false`)

#### Scenario: A manifest with no `runtime.theme` still validates (regression)

- GIVEN the pre-change fixture corpus (`tests/fixtures/manifest-all-types.json`, fleet
  manifests) with no `runtime.theme` set
- WHEN `validateManifestV2()` runs
- THEN every previously-valid manifest MUST remain `{ valid: true, errors: [] }`
