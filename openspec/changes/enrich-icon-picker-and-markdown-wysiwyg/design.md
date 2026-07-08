## Context

Two rich widgets live only inside OpenCatalogi and should be shared:

- **Icon picker** — [`opencatalogi/src/modals/menuItem/MenuItemForm.vue`](../../../../opencatalogi/src/modals/menuItem/MenuItemForm.vue) builds FontAwesome (`fas`/`far`/`fab`) option lists by iterating the imported packs, searches them with dedupe + a 120-item display cap (unlimited while a query is present), previews icons inline in the `NcSelect` option/selected slots, offers a **custom-SVG** mode with a CodeMirror XML editor and a `formatSVG`/`prettySvg` pretty-printer, and stores an icon **placement** (left/right).
- **Markdown editor** — [`opencatalogi/src/modals/pageContents/PageContentForm.vue`](../../../../opencatalogi/src/modals/pageContents/PageContentForm.vue) mounts `@toast-ui/vue-editor` (`Editor as vMdEditor`) in WYSIWYG mode with a configurable `toolbarItems` set and heavy `:deep()` NC-variable theming.

The library already owns thinner versions of both. Crucially, `CnIconBrowser` established the library's icon principle: **it imports no icon package** — the consumer passes a normalized catalogue (`{ key, label, value, search, path?, component? }`) via the `icons` prop, and `iconCatalogue.js` provides adapters that turn a popular source into that shape. This change extends that principle to `CnIconPicker` and to two additional sources (FontAwesome, OpenGemeenten), which also cleanly resolves the licensing question: the library only ever ships *adapters and UI*, never third-party icon data.

Not applicable to this change: OpenRegister seed data (ADR-001) and declarative-vs-imperative behaviour (ADR-031) — this is a pure Vue 2.7 frontend library change with no schema register, lifecycle, aggregation, or notification surface.

## Goals / Non-Goals

**Goals:**
- Give `CnIconPicker` opt-in multi-source (MDI/FontAwesome/OpenGemeenten), search, custom-SVG authoring, and placement — with zero change to existing consumers.
- Let a JSON-Schema property drive an icon field via `CnFormDialog` (`widget: 'icon'`).
- Deliver the WYSIWYG mode `CnMarkdownEditor` already advertises, without adding editor weight to the default textarea path.
- Keep the library icon-pack-free; attribute and licence-caveat FontAwesome and OpenGemeenten in the README.
- Capture (not build) a `CnContentBlockEditor` proposal.

**Non-Goals:**
- Bundling any icon pack (`@mdi/js`, `@fortawesome/*`, `@opengemeenten/*`) as a hard runtime dependency.
- Building `CnContentBlockEditor` or migrating OpenCatalogi off its bespoke forms (later changes).
- Changing the default appearance/behaviour of any existing component.

## Decisions

### D1 — Bring-your-own catalogue, library ships adapters only
`CnIconPicker` gains a `catalogues` prop: `{ mdi?, fontawesome?, opengemeenten? }` where each value is a catalogue array in the existing `iconCatalogue.js` shape. The library adds adapters `fromMdiJs(mdiModule)`, `fromFontAwesome({ fas?, far?, fab? })`, `fromOpenGemeenten(list)` that convert a source into that shape (the FA adapter ports `MenuItemForm.created()`'s pack-iteration + `buildUniqueOptions` dedupe logic). **Why:** matches the `CnIconBrowser` precedent, keeps the bundle lean and tree-shakeable, and puts the licensing decision where it belongs — with the consumer. *Alternative rejected:* importing the packs directly in the library — simplest for consumers but bundles CC-BY-NC-ND / trademarked assets into a EUPL library and bloats every app.

### D2 — MDI default via optionalDependency + graceful fallback
The user wants "full MDI range by default." MDI is the Nextcloud-native system, so `@mdi/js` is declared as an **optionalDependency**. When `sources` includes `mdi` and no `catalogues.mdi` is supplied, the picker attempts a lazy `import('@mdi/js')` and adapts it; if that import fails (pack absent), it falls back to the current built-in `DASHBOARD_ICONS` set so the component always renders. **Why:** honours "full range by default" where the pack is installed (it is, transitively, across the fleet) without making the library hard-fail when it isn't. *Alternative rejected:* hard dependency on `@mdi/js` — violates the icon-pack-free principle and forces the weight on apps that only use custom icons.

### D3 — `sources` is a list; single source hides the switcher
`sources: string[]` (default `['mdi']`). The source-switcher (a small tab/segmented control) renders only when `sources.length > 1`. "Only FontAwesome" is `sources: ['fontawesome']`; "MDI and FA" is `['mdi','fontawesome']`. **Why:** directly expresses the user's "also or only" requirement with one prop and no combinatorial flags.

### D4 — Search + display cap reused from the browser
Searching reuses `CnIconBrowser/fuzzy.js`; the dedupe-by-value + 120-item cap (uncapped while querying, always keeping the selected icon visible) is ported from `filteredLimitedIconOptions`. **Why:** the FA solid pack alone is ~1000 icons — rendering all tiles is janky; the cap keeps first paint fast and search comprehensive.

### D5 — Custom-SVG mode reuses the existing CodeMirror dep
`allowCustomSvg` adds a mode toggle (standard ↔ custom); custom shows a CodeMirror XML editor (`@codemirror/lang-xml`, already a dependency) plus a "Format SVG" button wired to the ported `formatSVG`/`prettySvg` DOM-serializer. The emitted value for a custom icon is the raw SVG string; placement and mode travel alongside via `v-model:placement` and an emitted `mode`. **Why:** no new dep, and the pretty-printer is battle-tested in OpenCatalogi.

### D6 — WYSIWYG is a new `mode` value, editor lazy-loaded
`CnMarkdownEditor` adds `mode: 'wysiwyg'` to its existing `MODES`. Only when that mode is active does the component `await import('@toast-ui/vue-editor')` (+ its CSS) and mount the editor; `edit`/`split`/`preview` never touch Toast UI. The `v-model` contract is unchanged — the WYSIWYG editor reads `value` on load and emits `input` (HTML/markdown) on change, mirroring `PageContentForm`'s `@load`→`getHTML()` bridge. **Why:** fulfils the docblock's promised forward-compatible contract and keeps the ~200 KB editor out of the default path. *Alternative rejected:* a separate `CnRichTextEditor` component — duplicates toolbar/theming and splits the mental model the docblock already set.

### D7 — Schema field wiring mirrors the existing `json`/`code` branches
`CnFormDialog` gains an `else-if field.widget === 'icon'` branch (alongside `json`/`code`) that renders `CnIconPicker` bound to `formData[field.key]`, forwarding `field.iconSources` → `sources`, `field.allowCustomSvg`, `field.catalogues`, `field.searchable`. **Why:** consistent with how the dialog already dispatches structured widgets; no new extension mechanism.

## Risks / Trade-offs

- **Toast UI bundle weight** → lazy-load behind `mode:'wysiwyg'`; document that enabling WYSIWYG pulls the editor chunk. Mark packages in Rollup externals/`sideEffects` correctly so the default path stays clean.
- **`@mdi/js` optionalDependency absent in some install** → D2 fallback to `DASHBOARD_ICONS` guarantees render; surface a one-line console hint, not a throw.
- **Licensing confusion (FA trademark / opengemeenten BY-NC-ND package)** → README "Icon sets & licensing" states the library ships only the capability and the consumer must confirm their own rights; adapters accept consumer-provided data so nothing is bundled.
- **jsdoc-baseline / docs-freshness CI gates** → new props need 100% jsdoc; run `npm run prebuild:docs`, `check:jsdoc`, `check:docs` and commit regenerated partials in the same change.
- **Backward-compat regressions** → every addition is a defaulted prop or a new enum value; existing tests must stay green and new tests assert the defaults render the old behaviour.

## Migration Plan

Purely additive to the library; no data or API migration. Rollout: land the change → publish a beta → consumers opt in per component. Rollback = revert the PR; no consumer breaks because nothing existing changed. OpenCatalogi adopting the shared components (retiring `MenuItemForm`/`PageContentForm`) is deliberately deferred to a follow-up change.

## Open Questions

- None blocking. Follow-up (out of scope): whether `CnIconBrowser` and the enriched `CnIconPicker` should later converge into one component — captured for the `CnContentBlockEditor`/icon-consolidation write-up, not decided here.
