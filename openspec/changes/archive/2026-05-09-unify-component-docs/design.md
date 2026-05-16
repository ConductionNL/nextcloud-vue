# Design: Unify component documentation

## Information architecture

```
nextcloud-vue.conduction.nl/
├── /                                Docusaurus landing
├── /docs/getting-started            Hand-written
├── /docs/architecture/*             Hand-written narrative (existing)
├── /docs/building-apps/             New umbrella for app-level guides
│   ├── layouts/                     ← from docs/layouts/
│   ├── cards/                       ← from docs/cards/
│   ├── i18n/                        ← from docs/i18n/
│   ├── integrations/                ← from docs/integrations/
│   ├── store/                       ← from docs/store/
│   └── manifest/                    ← migrating-to-manifest.md + new content
├── /docs/components/                Per-component pages (hybrid)
│   ├── index.md                     Categorised barrel-export list
│   └── <name>.md                    Narrative + <Playground/> + <GeneratedRef/>
├── /docs/composables/               ← from docs/utilities/composables/
├── /docs/utilities/                 ← from docs/utilities/
├── /docs/design-tokens/             NEW — ported from styleguide/nextcloud-tokens.md
│   ├── colors/                      ← styleguide/nextcloud-tokens.css
│   ├── animations/                  ← styleguide/nextcloud-animations.css
│   └── globals/                     ← styleguide/nextcloud-globals.css
└── /styleguide/                     Vue Styleguidist build (kept; iframe target)
```

The `/styleguide/` path stays a working standalone URL for power users who prefer the playground-only view, but it's no longer surfaced in nav. The unified Docusaurus site is the discovery surface.

## Decision 1 — Live demos: iframe-embedded Styleguidist (not MDX-native Vue)

**Chosen:** A custom MDX component `<Playground component="CnDataTable" />` renders an iframe pointed at `/styleguide/#!/CnDataTable` with sensible default height, a "Open standalone" link, and a "Copy mock data" affordance.

**Why not MDX-native Vue:**
- The library is Vue 2.7. Docusaurus 3.9 is React 18 + MDX 3. Mounting Vue 2 components inside React MDX requires either:
  - `docusaurus-plugin-usevue` — exists but only ~30 commits, no clear maintenance, declares Docusaurus 2 compat.
  - Hand-rolled `vue-demi` / `@vue/composition-api` bridge with a custom `<VueMount>` MDX component — works but is fragile and locks us into the bridge until the library moves to Vue 3.
- The live runtime we already have (Styleguidist) works, has its mocks set up, and is being maintained for `/beta/styleguide/` deploys.
- Iframe isolation is a net feature for a doc site: a buggy demo can't crash the whole page, styles can't leak, and the demo's bundle is loaded lazily.

**Why not full Storybook migration:**
- Storybook 8 supports both Vue 2.7 and autodocs, but it's a *replacement* for Styleguidist + a different rendering engine for the playground than Docusaurus. Useful long-term, but doesn't fold into Docusaurus — it'd be a third tool.
- Defer to post-Vue-3 migration. Re-evaluate then alongside Histoire and VitePress.

**Risk we're accepting:** iframes don't share parent typography/density — a `<CnDataTable>` in the iframe will look different from Docusaurus body text around it. Mitigation: theme the Styleguidist build to match Docusaurus tokens (one shared CSS variable file).

## Decision 2 — Auto-generated reference: vue-docgen-cli prebuild

**Chosen:** Add a `prebuild:docs` npm script that runs `vue-docgen-cli` over `src/components/Cn*/Cn*.vue` and writes one markdown partial per component to `docs/components/_generated/<name>.md`. Each per-component MDX page imports its partial.

```mdx
---
title: CnDataTable
---
import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnDataTable.md'

# CnDataTable

<!-- hand-written narrative: purpose, when to use, design rationale -->

## Try it

<Playground component="CnDataTable" />

## Reference

<GeneratedRef />
```

**Source of truth:** the SFC's `<script>` JSDoc comments + prop / event / slot declarations. This is exactly what Vue Styleguidist already reads — `vue-docgen-cli` is its sister tool, same parser (`vue-docgen-api`), so we keep the JSDoc convention the team already writes.

**Templating hooks:** `vue-docgen-cli` supports per-section template overrides. We use this to:
- Render prop / event / slot tables with Docusaurus-friendly markdown (no MDX braces — apply the same `\{...\}` escape logic that bit us in #135).
- Suppress sections that are empty (e.g. components with no slots get no Slots heading).
- Emit a stable header so we can detect drift in CI (`scripts/check-docs.js` already enforces existence; gets extended to enforce that the generated partial is fresh).

**CI enforcement:** the `Frontend Quality` workflow runs `npm run prebuild:docs` and fails if `docs/components/_generated/` has uncommitted diffs. Authors run it locally before committing prop changes.

**Risk we're accepting:** generated partials commit into git (rather than building on the fly during the Docusaurus deploy). Trade-off: PR diffs become noisier when props change, but the alternative — runtime generation only — means every CI build runs the prebuild step and we lose the "human reviewer can see what changed" property. Worth the noise.

## Decision 3 — URL strategy: custom domain at root, styleguide as subpath

**Chosen:**
- `url`: `https://nextcloud-vue.conduction.nl`
- `baseUrl`: `/`
- `editUrl`: function form pointing at `edit/beta/docs/<docPath>`
- `/styleguide/` deployed alongside Docusaurus build (the existing `documentation.yml` workflow on `main` already does this; `documentation-beta.yml` and `documentation-dev.yml` keep the `/beta/styleguide/` and `/dev/styleguide/` subpaths working with `keep_files: true`).

This is what [#135](https://github.com/ConductionNL/nextcloud-vue/pull/135) makes real for `beta`. The spec needs to be MODIFIED to match (currently it mandates the GitHub Pages defaults).

**Why not flat-rebrand to docs.conduction.nl or similar:** breaks every existing inbound link. The CNAME is established.

## Decision 5 — Auto-update via JSDoc completeness ratchet (not a one-time pass)

The proposal promises "components update → docs update automatically." A naive read of that is "we'll just run vue-docgen-cli on every build." But that only works if the JSDoc the generator reads stays complete. A description-less prop produces a description-less doc row — auto-gen captures whatever's in the source, including its gaps.

So the auto-update guarantee has three layers, not one:

**G1 — Freshness (cheapest, lands first).** CI fails any PR where regenerating the partial produces a diff against the committed file. Forces the regeneration to be part of every prop-changing commit. Already in tasks.md Phase 1; tightened in Phase 2.5.

**G2 — Completeness (the real lift).** A `scripts/check-jsdoc.js` step scores each Cn* component on prop / event / slot JSDoc coverage and compares against a per-component baseline at `scripts/.jsdoc-baselines.json`. CI fails if any score regresses below baseline. New components (no baseline entry) require 100%.

The ratchet lets us start where the codebase is today (most components are at 50–80% coverage) and improve incrementally, one PR per component or category, without ever blocking the fleet on a flag-day flip. This mirrors how TypeScript projects roll out strict mode.

**G3 — Discoverability.** Authors learn the convention before their first PR via:
- A `scripts/new-component.js` scaffolder that emits a 100%-compliant skeleton.
- A short CLAUDE.md "Documenting components" reference with three canonical JSDoc shapes (prop, event, slot).
- Failure messages from `check-jsdoc.js` that cite component / item / line numbers — clickable in Cursor / VS Code.

**Why not a one-time JSDoc fillout pass?** Two reasons:
1. The drift returns the moment someone adds a prop without rich JSDoc. The fix is structural (a CI gate), not procedural (a docs day).
2. JSDoc fillout for ~32 components is large enough that batching it as one PR creates merge conflicts with every concurrent feature change. Splitting per-component (each PR bumps its own baseline) is cleaner.

**Why not run jsdoc-completeness as warnings, not errors?** Because warnings get ignored. The ratchet pattern means the bar starts at the current score, so existing PRs aren't blocked — only regressions are. That's the same political cost as a warning but with real teeth.

**Convenience layer (G3.5).** Optional pre-commit hook (husky / simple-git-hooks) that runs `prebuild:docs` and stages the regenerated partial when a Cn* SFC is in the staged set. CI is the load-bearing enforcement; the hook is ergonomics.

## Decision 4 — Sequence: code-fix first, then content migration

The unification is content-heavy (32 component pages × 2 sections each + 6 design-token pages + sidebar restructure). It can't be one PR. Phasing:

- **Phase 0 — broken-root unblock** (already done): #135 lands `baseUrl: '/'` + URL fix + two MDX brace bugs.
- **Phase 1 — autodoc infrastructure**: install `vue-docgen-cli`, write the templates, generate partials for **one** component (CnDataTable) end-to-end. Land as a single small PR. Ground truth before scaling.
- **Phase 2 — Playground MDX component**: write `src/components/Playground.tsx` (yes, .tsx — Docusaurus is React) with iframe wrapper, height auto-sizing via postMessage, "open standalone" link. Land alongside one component using it.
- **Phase 3 — content port**: walk every Cn* component, add narrative + `<Playground>` + `<GeneratedRef />`. Can be parallel sub-PRs by category (Layout, Data Display, Dialogs, etc.) each touching ~6 components. Each PR keeps the existing pages working — autodoc replaces the existing prop tables incrementally.
- **Phase 4 — design tokens import**: port `nextcloud-tokens.md`, `nextcloud-globals.css`, `nextcloud-animations.css` into `docs/design-tokens/` with proper Docusaurus pages.
- **Phase 5 — sidebar IA + redirects**: update [sidebars.js](../../../docusaurus/sidebars.js) to surface the new structure; add `@docusaurus/plugin-client-redirects` entries from old paths.
- **Phase 6 — spec ratification**: this change archives.

Phase 1 + 2 are the load-bearing infrastructure; once they land, Phase 3 scales by simple repetition.

## Open questions deferred to implementation

- **Theme parity between iframe and host.** Do we ship a shared `nextcloud-tokens.css` from the lib + load in both Docusaurus and Styleguidist, or accept visual drift? Spike during Phase 2.
- **i18n of generated partials.** The current docs are EN + NL via Docusaurus's i18n. Auto-generated tables are EN-only (from JSDoc). Acceptable v1 — props/events are technical identifiers, not user-facing text. Revisit if users complain.
- **Search scope.** Algolia DocSearch covers Docusaurus pages but not the iframed playground. Acceptable: developers searching for a component name still hit the Docusaurus page where the playground lives.
