---
status: draft
---

# component-reference delta — unify-component-docs

## Purpose

Authorize the auto-generated reference pipeline as the satisfaction mechanism for the existing per-component documentation requirements. Hand-maintained prop / event / slot tables in `docs/components/<name>.md` are replaced by `vue-docgen-cli`-generated partials at `docs/components/_generated/<name>.md`, imported into the page via MDX. The hand-written narrative (description, when-to-use, design rationale, examples, Nextcloud relationship) stays.

## MODIFIED Requirements

### Requirement: Individual Component Pages

Each exported component MUST have its own documentation page at `docs/components/{component-name}.md` containing:

1. **Description (hand-written)** — What the component does and when to use it
2. **Live Playground (auto-embedded)** — A `<Playground component="{name}" />` MDX element rendering the Vue Styleguidist iframe for the component (see `docs-site-infrastructure` Requirement: Live-demo Playground component)
3. **Reference (auto-generated)** — Imported via MDX from `docs/components/_generated/{name}.md`. The partial MUST contain props, events, and named slots, all derived from the SFC source by `vue-docgen-cli`. Empty sections (no events, no slots) MUST be suppressed in the partial output.
4. **Usage example (hand-written)** — A complete Vue SFC `<template>` snippet showing typical usage in context. May be omitted if the Playground demo already covers the same ground.
5. **Nextcloud relationship (hand-written)** — Which Nextcloud Vue primitive(s) it wraps or extends, with a link to the Nextcloud Vue Components documentation.

The hand-written sections (1, 4, 5) live in the `<name>.md` file at the top. The auto-generated section (3) lives in `_generated/<name>.md` and is rendered via `import Ref from './_generated/{Name}.md'` + `<Ref />`. Items 2 and 3 MUST be visually distinct (e.g. the Playground above an `## Reference` heading) so a reader can scan to the type tables.

#### Scenario: Developer looks up CnIndexPage

- GIVEN a developer visits the CnIndexPage component page
- WHEN they read the page
- THEN they SHALL see a description, an interactive Playground iframe loading `/styleguide/#!/CnIndexPage`, an auto-generated Reference section below with props table (schema, objects, pagination, loading, selectable, viewMode, etc.), events table (@create, @edit, @delete, @copy, @refresh, @mass-*), slots table (#delete-dialog, #form-dialog, #field-\{key\}, etc.), a hand-written usage example, and a note explaining it composes CnActionsBar, CnDataTable, CnCardGrid, CnPagination and the dialog components

#### Scenario: Developer looks up CnIcon

- GIVEN a developer visits the CnIcon component page
- WHEN they read the page
- THEN they SHALL see (1) the hand-written `registerIcons()` pattern documented alongside (3) the auto-generated CnIcon props, the PascalCase resolution rule, and the HelpCircleOutline fallback explained as part of the hand-written description

#### Scenario: Developer looks up CnDashboardPage
(unchanged in intent; same content sourced from auto-gen + hand-written)

#### Scenario: Developer looks up CnAdvancedFormDialog
(unchanged in intent; the two-phase confirm-then-result pattern remains hand-written narrative)

#### Scenario: Developer looks up CnDetailPage
(unchanged in intent)

### Requirement: Props Documentation Accuracy

All props tables MUST be **mechanically derived** from the actual component source code in `src/components/Cn*/Cn*.vue` by `vue-docgen-cli` at build time. Every prop listed in a component's `props` definition MUST appear in the generated partial; no props CAN be fabricated because the partial is reproducibly generated from source. Props inherited from Nextcloud Vue parent components are out of scope for the generator and MUST be noted separately in the hand-written description section if the inheritance is meaningful.

CI MUST fail any PR where regenerating `_generated/<name>.md` produces a diff against the committed file (see `docs-site-infrastructure` Requirement: Auto-generated component reference).

#### Scenario: Props match source code for CnDataTable

- GIVEN a developer compares `docs/components/_generated/CnDataTable.md` with `CnDataTable.vue`'s `props` definition
- WHEN they check each prop
- THEN every prop from the source MUST appear in the generated partial with its declared type, default, and JSDoc-derived description, and no extra props SHALL be listed

#### Scenario: Props match source code for CnFormDialog

- GIVEN a developer compares `docs/components/_generated/CnFormDialog.md` with `CnFormDialog.vue`'s `props` definition
- WHEN they check each prop
- THEN every prop from the source MUST appear in the generated partial including schema, item, title, confirmLabel, and any slot-related props

#### Scenario: Deprecated props are marked

- GIVEN a component declares a prop with `@deprecated` JSDoc and a `console.warn` runtime check
- WHEN `vue-docgen-cli` generates the partial
- THEN the prop entry MUST include a "Deprecated" marker and the @deprecated message verbatim

#### Scenario: Stale partial fails CI

- GIVEN a contributor adds a prop to `CnFormDialog.vue` but does not regenerate the partial
- WHEN CI runs `npm run prebuild:docs && git diff --exit-code docs/components/_generated/`
- THEN the job MUST fail with the missing prop visible in the diff

### Requirement: Events Documentation

Each component that emits events MUST have its events documented in the auto-generated partial, with each event's name, payload type/shape (from JSDoc `@property` or TypeScript types), and description (from JSDoc above the `$emit` call or `emits:` declaration). Events emitted by child components that bubble up (e.g., CnIndexPage re-emitting CnDataTable events) MUST be documented on the parent component page — either via the parent's `emits:` declaration (preferred — `vue-docgen-cli` will pick them up) or, if the parent re-emits without declaring, in the hand-written narrative.

#### Scenario: CnIndexPage event documentation is complete

- GIVEN a developer reads the CnIndexPage events table in `_generated/CnIndexPage.md`
- WHEN they review the events
- THEN they SHALL find @create, @edit, @delete, @copy, @refresh, @mass-*, @sort, @page-change, @filter-change, @search, and @row-click documented with payload shapes derived from JSDoc

#### Scenario: Two-phase dialog events are explained

- GIVEN a developer reads CnDeleteDialog
- WHEN they review the confirm event
- THEN the auto-generated table MUST list `@confirm` with its payload, AND the hand-written description above MUST explain the two-phase pattern: @confirm fires when the user clicks confirm, then the parent calls setDeleteResult() to close the dialog with success/error state

#### Scenario: Developer understands event payload

- GIVEN a developer reads the @mass-export event entry in the auto-generated partial
- WHEN they look at the payload column
- THEN the JSDoc-declared payload shape MUST appear (selected ids array + format string)

## ADDED Requirements

### Requirement: JSDoc completeness ratchet — "components update → docs update automatically"

The library MUST guarantee that documentation tracks component source automatically. This depends on three CI-enforced guarantees working together:

**G1 — Freshness:** the committed `docs/components/_generated/<name>.md` partial MUST match what `vue-docgen-cli` produces from current source. CI MUST run `npm run prebuild:docs && git diff --exit-code docs/components/_generated/` and fail any PR with a non-empty diff. This forces every prop / event / slot change to ship with its regenerated partial.

**G2 — Completeness:** the JSDoc on each `Cn*` SFC MUST be rich enough that the generated partial is genuinely useful. A `scripts/check-jsdoc.js` CI step MUST score each component:

| Item | Required JSDoc to count as "documented" |
|---|---|
| Prop | A non-empty leading `/** ... */` block above the prop's `props:` entry. For non-trivial types, an `@type {...}` tag. |
| Event | An `@event eventName Description` JSDoc tag at the `$emit` site, with an `@type {...}` describing the payload shape. Single-payload events MAY use `@property` style. |
| Named slot | A JSDoc `@slot name description` (or `<!-- @slot ... -->` template comment) above the `<slot name="...">`. Scoped slots additionally require `@binding {Type} key description` for each scope key. |

For each component the script computes `score = documented / total`, and compares against the per-component baseline committed at `scripts/.jsdoc-baselines.json`. The build MUST fail if any component's score regresses below its baseline. New components (no baseline entry) MUST score 100% to pass.

The baseline file MUST be regenerated by running `npm run jsdoc-baselines:update` on a clean tree. Each PR that improves a component's JSDoc MUST commit the bumped baseline alongside.

**G3 — Discoverability:** authors MUST learn the convention before — not after — opening a PR. The library MUST ship:

- A `scripts/new-component.js` scaffolder that writes a fresh `Cn*` skeleton with the required JSDoc shells (description, props with `/** ... */` placeholders, `@event` / `@slot` tags) so new components start at 100%.
- An entry in [CLAUDE.md](../../../CLAUDE.md) under "Documenting components" describing the three required JSDoc shapes (prop, event, slot) with one canonical example each.
- The `check-jsdoc.js` failure message MUST cite the component, the missing items by name, and the SFC line numbers — so the author fixes by jumping to the line, not by guessing.

#### Scenario: Adding a prop without JSDoc fails CI

- GIVEN a developer adds a new prop to `CnDataTable.vue` without a `/** ... */` JSDoc block above it
- WHEN they run `git push` and CI executes the `Frontend Quality` workflow
- THEN `scripts/check-jsdoc.js` MUST fail the build with a message naming the prop, the file path, and the line number, AND the build MUST NOT proceed to deploy

#### Scenario: Improving JSDoc bumps the baseline

- GIVEN a developer adds a missing description to an existing prop
- WHEN they run `npm run jsdoc-baselines:update && git diff scripts/.jsdoc-baselines.json`
- THEN the baseline file MUST show that component's score increased
- AND the developer MUST commit the bumped baseline so a future regression below this new bar is caught

#### Scenario: New component ships at 100%

- GIVEN a developer adds `src/components/CnNewWidget/CnNewWidget.vue` (with no entry in `.jsdoc-baselines.json`)
- WHEN CI runs `check-jsdoc.js`
- THEN the component MUST score 100% (every prop / event / slot fully documented) or the build MUST fail with a list of missing JSDoc

#### Scenario: Author learns the convention before opening a PR

- GIVEN a developer is asked to add a new `Cn*` component
- WHEN they read CLAUDE.md "Documenting components" and run `npm run new-component CnExampleWidget`
- THEN the scaffolded SFC MUST already include the prop / event / slot JSDoc shells with placeholder text, so filling them in is the smallest possible step before passing CI

### Requirement: Auto-regeneration on commit (developer ergonomics)

The library SHOULD ship a pre-commit hook (e.g. via `husky` or `simple-git-hooks`) that runs `npm run prebuild:docs` whenever a `src/components/Cn*/Cn*.vue` file changes in the staged set, and stages the regenerated partial. This makes the freshness guarantee (G1) automatic at commit time so authors don't have to remember.

The hook MUST be opt-in friendly: a developer who runs `npm run prebuild:docs` manually before committing MUST get the same result without double work. CI is the load-bearing enforcement; the hook is a convenience.

#### Scenario: Editing a SFC auto-regenerates its partial on commit

- GIVEN a developer adds a prop to `CnDataTable.vue` and stages only the SFC (`git add src/components/CnDataTable/CnDataTable.vue`)
- WHEN they run `git commit -m "..."`
- THEN the pre-commit hook MUST run `prebuild:docs`, regenerate `docs/components/_generated/CnDataTable.md`, and stage it
- AND the resulting commit MUST include both the SFC change and the regenerated partial
