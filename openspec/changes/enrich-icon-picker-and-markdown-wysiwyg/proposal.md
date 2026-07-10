---
kind: code
depends_on: []
---

## Why

OpenCatalogi's menu-item and page-content editors ([`MenuItemForm.vue`](../../../../opencatalogi/src/modals/menuItem/MenuItemForm.vue), [`PageContentForm.vue`](../../../../opencatalogi/src/modals/pageContents/PageContentForm.vue)) carry two genuinely rich, reusable widgets that never made it into the shared library: a **FontAwesome icon picker with search + custom-SVG editing**, and a **Toast UI WYSIWYG markdown editor**. The library already ships thinner reimplementations (`CnIconPicker` is MDI-only with image upload; `CnMarkdownEditor` is a textarea+preview MVP whose own docblock flags WYSIWYG as an unbuilt follow-up). This change ports the missing capability into those existing components so every consumer app can reuse them from one place instead of copying markup.

## What Changes

- **`CnIconPicker` — multi-source, searchable, custom-SVG (additive, all new props defaulted):**
  - New `sources` prop (default `['mdi']`) selecting any of `mdi` / `fontawesome` / `opengemeenten`; a source-switcher renders only when more than one is enabled ("also or only" — it is a list).
  - New consumer-supplied `catalogues` map following the existing `CnIconBrowser/iconCatalogue.js` bring-your-own shape. The library ships **adapters** (`fromMdiJs`, `fromFontAwesome`, `fromOpenGemeenten`) but **bundles no icon pack** — consumers own (and license) the icon data.
  - New `searchable` prop: a search box reusing `CnIconBrowser/fuzzy.js` with dedupe + display-limit (ported from `MenuItemForm.filteredLimitedIconOptions`).
  - New `allowCustomSvg` prop: a custom-SVG mode using CodeMirror (`@codemirror/lang-xml`, already a dep) plus the `formatSVG`/`prettySvg` pretty-printer ported from `MenuItemForm.vue`.
  - New `placement` (`v-model:placement`, left/right) ported from the FA form.
  - Existing `value` / `icons` / `compact` / `clearable` / `uploadFn` props are unchanged. Default MDI range comes from an **optional** `@mdi/js` (optionalDependency) with graceful fallback to the current `DASHBOARD_ICONS` set when absent.
- **`CnFormDialog` — schema-configurable icon field:** a new `widget: 'icon'` branch renders `CnIconPicker`, forwarding `field.iconSources` / `field.allowCustomSvg` / `field.catalogues`. This is the "configurable through the schema" path — a property declares `{ widget: 'icon', iconSources: ['mdi','fontawesome'] }`.
- **`CnMarkdownEditor` — opt-in WYSIWYG:** a new `mode: 'wysiwyg'` value (the component's docblock already promises this forward-compatible contract) backed by lazy-loaded `@toast-ui/editor` + `@toast-ui/vue-editor`, porting the toolbar/`editorOptions` and NC-var theming from `PageContentForm.vue`. The existing `edit` / `split` / `preview` textarea path stays the default — **no breaking change**.
- **README — icon-set attribution & licensing:** a new "Icon sets & licensing" section attributing FontAwesome and OpenGemeenten ([gemeenteniconen.nl](https://www.gemeenteniconen.nl/)), stating the library ships only the *capability* and that consumers must ensure they are licensed to use FontAwesome (and the opengemeenten package terms) in their own use case.
- **Content-block editor — proposal doc only (NOT built):** a design write-up for a future `CnContentBlockEditor` capturing `PageContentForm`'s typed blocks (`text`/`RichText`/`Image`/`Faq`/`Quote`/`ContentBlocks`), auto-growing draggable FAQ/blocks, and DOMPurify sanitization.

No breaking changes: every new prop is defaulted and every new mode/source is opt-in.

## Capabilities

### New Capabilities
- `icon-picker`: `CnIconPicker`'s multi-source model — MDI/FontAwesome/OpenGemeenten source selection, bring-your-own catalogue adapters (library bundles no pack), searchable grid, custom-SVG authoring, and icon placement.
- `markdown-editor`: `CnMarkdownEditor`'s layout-mode model extended with an opt-in Toast UI WYSIWYG mode, lazy-loaded so the default textarea path carries no dependency cost.

### Modified Capabilities
- `dialog-system`: `CnFormDialog` gains a `widget: 'icon'` field renderer that mounts `CnIconPicker` and forwards its schema-declared configuration.

## Impact

- **Components:** `src/components/CnIconPicker/` (+ new adapter module), `src/components/CnMarkdownEditor/`, `src/components/CnFormDialog/`.
- **Docs:** README "Icon sets & licensing"; component doc pages + regenerated `_generated` partials; jsdoc baselines; a new `docs/architecture/` (or `docs/components/`) proposal write-up for `CnContentBlockEditor`.
- **Dependencies:** adds `@toast-ui/editor` + `@toast-ui/vue-editor` (lazy-loaded); adds `@mdi/js` as an **optionalDependency**. `@codemirror/lang-xml` and `dompurify` are already present. **No `--legacy-peer-deps`.**
- **Consumers:** affects all five (OpenRegister, OpenCatalogi, Procest, Pipelinq, MyDash) additively — existing usages compile and render unchanged; OpenCatalogi is the first intended adopter (it can retire its bespoke `MenuItemForm`/`PageContentForm` widgets in a later change).
- **Theming:** all new markup uses Nextcloud CSS variables and the `cn-` class prefix; no `--nldesign-*` references.
- **Backward compatibility:** fully preserved — no prop/event/slot removed or repurposed.
