## 1. Icon catalogue adapters & CnIconPicker

- [ ] 1.1 Add `fromMdiJs`, `fromFontAwesome` (pack-iteration + dedupe ported from `MenuItemForm.created()`/`buildUniqueOptions`), and `fromOpenGemeenten` adapters producing the `{ key, label, value, search, path?, component? }` shape; export them from the component barrel and `src/index.js`
- [ ] 1.2 Add `sources` prop to `CnIconPicker` (default `['mdi']`) and a source-switcher rendered only when `sources.length > 1`
- [ ] 1.3 Add `catalogues` prop; when `mdi` is enabled with no supplied catalogue, load the full range via optional `@mdi/js` with graceful fallback to `DASHBOARD_ICONS`
- [ ] 1.4 Add `searchable` prop: search box reusing `CnIconBrowser/fuzzy.js` with dedupe + bounded display cap (uncapped while querying; selected icon always visible)
- [ ] 1.5 Add `allowCustomSvg` prop: custom mode with a CodeMirror XML editor and a "Format SVG" action wired to ported `formatSVG`/`prettySvg`; emit raw SVG as the value in custom mode
- [ ] 1.6 Add `placement` via `v-model:placement` (left/right, default `left`) emitting `update:placement`

## 2. Schema-driven icon field

- [ ] 2.1 Add an `else-if field.widget === 'icon'` branch to `CnFormDialog` that mounts `CnIconPicker` bound to `formData[field.key]`, forwarding `field.iconSources` → `sources` plus `allowCustomSvg`/`catalogues`/`searchable`

## 3. CnMarkdownEditor WYSIWYG

- [ ] 3.1 Add `wysiwyg` to `MODES`; render the Toast UI editor only in that mode, keeping the textarea path for `edit`/`split`/`preview`
- [ ] 3.2 Lazy-load `@toast-ui/vue-editor` + CSS on entering `wysiwyg`; preserve value-in/input-out; port the configurable toolbar/`editorOptions` and NC-variable theming from `PageContentForm.vue`

## 4. Dependencies

- [ ] 4.1 Add `@toast-ui/editor` + `@toast-ui/vue-editor` dependencies and `@mdi/js` as an optionalDependency; set Rollup externals/`sideEffects` so the default paths stay clean; verify `npm install` resolves with no `--legacy-peer-deps`

## 5. Docs, README & content-block proposal

- [ ] 5.1 Add a README "Icon sets & licensing" section attributing FontAwesome and OpenGemeenten (gemeenteniconen.nl) and stating the library ships only the capability — the consumer must confirm their own rights to use FontAwesome and the opengemeenten package
- [ ] 5.2 Update `docs/components/cn-icon-picker.md`, `cn-markdown-editor.md`, `cn-form-dialog.md`; add jsdoc to every new prop/event; regenerate `_generated` partials
- [ ] 5.3 Write a `CnContentBlockEditor` proposal write-up (typed blocks, auto-growing draggable FAQ/blocks, DOMPurify) — documentation only, not implemented

## 6. Tests & CI gates

- [ ] 6.1 Tests for `CnIconPicker`: source-switcher visibility, adapter dedupe, MDI optional-dep fallback, search cap + selected-visible, custom-SVG format (valid/invalid), placement, and the unchanged default usage
- [ ] 6.2 Tests for `CnMarkdownEditor` (`wysiwyg` mount + lazy-load + v-model round-trip, default mode unchanged) and `CnFormDialog` `widget: 'icon'` (renders picker, updates formData)
- [ ] 6.3 Run `npm test`, `npm run check:docs`, `npm run check:jsdoc` (bump baselines only if coverage improved), and `npm run prebuild:docs`; commit regenerated partials — all green

## Acceptance criteria

- An existing `<CnIconPicker v-model="icon" />` renders and behaves identically to before (no visual or behavioural change).
- `CnIconPicker` can be configured to show MDI, FontAwesome, OpenGemeenten, or any combination, with search, custom-SVG, and placement.
- A JSON-Schema property `{ widget: 'icon', iconSources: [...] }` renders the picker inside `CnFormDialog` and persists the chosen icon.
- `CnMarkdownEditor` renders a Toast UI WYSIWYG editor when `mode="wysiwyg"`, and no Toast UI code is imported in any other mode.
- The library bundles no icon pack; README documents the attribution and licensing caveats.
- The `CnContentBlockEditor` write-up exists; the component is not built.
- All CI gates pass: `npm test`, `check:docs`, `check:jsdoc`, docs freshness.
