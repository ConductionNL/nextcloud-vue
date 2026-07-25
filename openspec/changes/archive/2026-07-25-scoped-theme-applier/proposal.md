---
kind: code
---

# Proposal: scoped-theme-applier

## Why

Two fleet apps have independently needed the same thing: let a leaf app apply one of
nldesign's NL Design System token sets to *its own* scoped surface (a virtual app, a widget)
without repainting the whole Nextcloud instance. OpenBuild built this first —
`src/composables/useAppTheme.js` fetches a token-set's CSS, rewrites `:root` to a
`[data-openbuild-theme-scope="<appSlug>"]` attribute selector, and injects it as one managed
`<style>` element — but it is OpenBuild-owned code, keyed to an OpenBuild-owned attribute name,
so no other Conduction app can reuse it.

nldesign's `app-token-set-selection` capability (openspec status: in-progress) closes the
server-side half of the gap: `GET /api/token-sets` (non-admin catalogue),
`POST /api/contrast/evaluate` (generic contrast facts, never a verdict), and a published,
fixed contract for the client-side scoped applier — including the design-system-owned scope
attribute `data-nldesign-theme-scope="<scopeId>"`, which **supersedes** OpenBuild's
`data-openbuild-theme-scope` so every leaf app shares one attribute instead of reinventing its
own. Per that contract and the fleet's architecture (app-specific *theming choice* is a leaf
concern; the *token catalogue*, *contrast math*, and *scoped-application rules* are nldesign's
domain), the client-side applier that implements the contract belongs in `nextcloud-vue` — the
one place every consuming app already shares component and composable code — not duplicated
per app and not folded into OpenBuild.

This change ports OpenBuild's proven, already-shipped applier into `@conduction/nextcloud-vue`
as a reusable composable that speaks the nldesign contract directly, wires it into `CnAppRoot`
so any manifest-driven app gets scoped theming for free by declaring `manifest.runtime.theme`,
and promotes `runtime.theme` into the canonical v2 manifest schema so the field is documented
and validated fleet-wide instead of living only in OpenBuild's local
`manifestValidation/theme.js`.

## What Changes

- **New composable** `src/composables/useScopedTheme.js` exporting `useScopedTheme()`. Implements
  the nldesign scoped-application contract: fetch `css/tokens/<tokenSet>.css`, verify it is
  exactly one flat `:root { }` block (bail-and-degrade — inject nothing — on anything else),
  rewrite to `[data-nldesign-theme-scope="<scopeId>"]`, inject as one managed
  `<style data-nldesign-theme="<scopeId>">`, and tear it down cleanly. Also exposes
  `listTokenSets()` and `evaluateContrast(candidates, background)` as thin, failure-tolerant
  wrappers over nldesign's `GET /api/token-sets` / `POST /api/contrast/evaluate` so leaf pickers
  never re-implement WCAG math or catalogue discovery.
- **`CnAppRoot` wiring** — the root `<NcContent>` carries a declarative
  `:data-nldesign-theme-scope="appId"` attribute; `setup()` watches the effective manifest's
  `runtime.theme` and calls `useScopedTheme().apply(manifest, appId)` on change,
  `beforeDestroy()` tears it down. Every `CnAppRoot`-hosted app gets scoped theming from its
  manifest with zero per-app applier code — this is the fleet-wide consumption path called for
  by the task; `CnPageRenderer` needs no change (the scope lives at the app-root container, not
  per page).
- **Schema promotion** — `src/schemas/app-manifest-v2.schema.json` gains a documented, validated
  `runtime.theme` field (`$defs/runtimeTheme`): `{ source: "nldesign", tokenSet, tokenSetName?,
  preview?: { primaryColor, backgroundColor } }`. Schema `version` bumps 2.19.0 → 2.20.0.
- **Docs** — new `docs/utilities/composables/use-scoped-theme.md`; updates to
  `docs/components/cn-app-root.md` and the v2 section of `docs/architecture/manifest.md`.

This spec covers ONLY the nc-vue side: the composable, the `CnAppRoot` wiring, and the manifest
schema field. It does **not** spec nldesign's endpoints (already spec'd in nldesign's
`app-token-set-selection`, treated here as a fixed, external contract) and does **not** spec
OpenBuild's picker UI or its `useAppTheme.js` deletion — those are OpenBuild's own follow-up
change, informed by this one shipping and publishing first (see Impact).

## Capabilities

- Added: `scoped-theme-applier`

## Impact

- No breaking change to any existing `CnAppRoot` prop, event, or slot — `runtime.theme` is
  optional and additive; an app that never sets it renders exactly as before (progressive
  enhancement — nldesign absent or unreachable degrades silently to default styling, never a
  throw).
- No breaking change to `app-manifest-v2.schema.json` — a manifest without `runtime.theme`
  validates exactly as it did before this change.
- This is a **publishable** library change (semantic-release beta dist-tag). OpenBuild's own
  reintegration — bumping its `@conduction/nextcloud-vue` dependency to the beta that ships this
  composable, then deleting its local `src/composables/useAppTheme.js` in favour of the shared
  one — happens in OpenBuild's repo as a separate, follow-up PR once this publishes; it is out of
  scope for this change but tracked in design.md.
