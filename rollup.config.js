import vue from 'rollup-plugin-vue'
import postcss from 'rollup-plugin-postcss'
import postcssImport from 'postcss-import'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Ship Leaflet's marker/layer images alongside the extracted CSS.
 *
 * `CnMapWidget` statically imports `leaflet/dist/leaflet.css`, which postcss
 * inlines into the extracted CSS with relative `url(images/marker-icon.png)`
 * references. Those paths are resolved by a CONSUMER's bundler relative to the
 * CSS file that contains them — so `images/` must exist next to EVERY extracted
 * stylesheet we ship, not just the one at the `dist/` root. We emit two:
 * `dist/nextcloud-vue.css` (cjs) and `dist/esm/nextcloud-vue.css` (esm, imported
 * by the esm entry banner). Copying into `dist/images/` alone left the esm build
 * resolving `dist/esm/images/layers.png`, which does not exist — every consumer
 * bundling the esm entry died with `Module not found: Can't resolve
 * 'images/layers.png'` (openbuild, 2026-07-12). Copy into both.
 *
 * @return {import('rollup').Plugin} A rollup plugin copying Leaflet images.
 */
function copyLeafletImages() {
	return {
		name: 'copy-leaflet-images',
		writeBundle() {
			const srcDir = path.resolve(__dirname, 'node_modules/leaflet/dist/images')
			if (!fs.existsSync(srcDir)) {
				return
			}
			// One copy per extracted stylesheet location.
			const outDirs = [
				path.resolve(__dirname, 'dist/images'),
				path.resolve(__dirname, 'dist/esm/images'),
			]
			for (const outDir of outDirs) {
				fs.mkdirSync(outDir, { recursive: true })
				for (const file of fs.readdirSync(srcDir)) {
					fs.copyFileSync(path.join(srcDir, file), path.join(outDir, file))
				}
			}
		},
	}
}

/**
 * Unwrap a `:deep( … )` token, honouring nested parens (e.g. `:deep(.x:not(.y))`).
 * @param {string} selector A CSS selector (or selector list) string.
 * @return {string} The selector with every `:deep(X)` replaced by `X`.
 */
function unwrapDeepSelector(selector) {
	let out = ''
	for (let i = 0; i < selector.length;) {
		if (selector.startsWith(':deep(', i)) {
			i += 6
			let depth = 1
			let inner = ''
			while (i < selector.length && depth > 0) {
				const ch = selector[i]
				if (ch === '(') depth++
				else if (ch === ')' && --depth === 0) { i++; break }
				inner += ch
				i++
			}
			out += unwrapDeepSelector(inner).trim()
		} else {
			out += selector[i++]
		}
	}
	return out
}

/**
 * PostCSS plugin that lowers Vue's `:deep(X)` SFC syntax to plain CSS `X`.
 *
 * rollup-plugin-vue (Vue 2) scopes the outer selector with `[data-v-*]` but only
 * lowers the legacy deep combinators (`::v-deep` / `>>>` / `/deep/`); it passes the
 * modern `:deep(...)` form through untouched. The library authors scoped styles
 * exclusively with `:deep(...)`, so without this every such rule ships as invalid
 * CSS and the browser drops it (e.g. the CnOpenBuildEditButton orange accent).
 * Since the outer compound is already scoped, unwrapping `:deep(.btn)` → `.btn`
 * yields the correct `… [data-v-*] .btn` descendant selector.
 */
const unwrapVueDeep = () => ({
	postcssPlugin: 'unwrap-vue-deep',
	Rule(rule) {
		if (rule.selector.includes(':deep(')) {
			rule.selector = unwrapDeepSelector(rule.selector)
		}
	},
})
unwrapVueDeep.postcss = true

/**
 * Anchor every SFC's default export to a module-LOCAL binding.
 *
 * `rollup-plugin-vue` emits an SFC as three modules under `preserveModules`:
 *
 *   Foo.vue2.js  the script object      Foo.vue3.js  the render function
 *   Foo.vue.js   `import script from './Foo.vue2.js'
 *                 import { render } from './Foo.vue3.js'
 *                 script.render = render
 *                 export default script`            ← wiring, by MUTATION
 *
 * Because `export default script` re-exports an IMPORTED binding, Rollup
 * resolves the export straight through to `Foo.vue2.js` and rewrites every
 * importer (including `dist/esm/index.js`) as:
 *
 *   import './Foo.vue.js'                                 // side effect only
 *   export { default as Foo } from './Foo.vue2.js'        // the real binding
 *
 * That shape is fatal in a webpack consumer. `dist/esm/index.js` is not (and
 * must not be) flagged side-effectful, so webpack's SideEffectsFlagPlugin
 * redirects `import { Foo } from '@conduction/nextcloud-vue'` directly at
 * `Foo.vue2.js` and then drops the barrel entirely — and the barrel was the
 * ONLY thing importing `Foo.vue.js`. The consumer receives the script object
 * with NO render function. Vue 3 production silently renders a comment node:
 * `#content` becomes `<!---->`, `__vue_app__` exists, zero console errors.
 * (Live 2026-07-27: openbuild's root IS `CnAppRoot`, so the whole app was
 * blank. Components a parent component pulls in via its own `.vue.js` import
 * were unaffected, which is why the failure looked arbitrary.)
 *
 * `sideEffects` globs cannot fix this — flagging the `.vue.js` wrappers only
 * stops webpack shaking such a module once it is IN the graph; here nothing
 * imports it at all. Flagging the barrel itself would work but forces every
 * consumer to bundle all 335 components (measured: 13.9MB to 18.4MB, unminified).
 *
 * So fix the emit shape instead: assign the wired script to a local `const`
 * and export THAT. The exported binding now lives in `Foo.vue.js`, so neither
 * Rollup nor webpack can resolve past it — `import { Foo } from '…'` reaches
 * the module that performs `script.render = render`, by construction, with no
 * dependence on bundler side-effect heuristics.
 *
 * @return {import('rollup').Plugin} A rollup plugin localising SFC default exports.
 */
function anchorSfcDefaultExport() {
	// Matches ONLY rollup-plugin-vue's own generated trailer.
	const DEFAULT_EXPORT = /(^|\n)export default script(?=\n|$)/
	return {
		name: 'anchor-sfc-default-export',
		transform(code, id) {
			// The SFC "main" module has no `?vue&type=…` query; the script /
			// template / style sub-blocks do, and must be left alone.
			const [filename, query] = id.split('?')
			if (query !== undefined || !filename.endsWith('.vue')) {
				return null
			}
			if (!DEFAULT_EXPORT.test(code)) {
				return null
			}
			return {
				code: code.replace(
					DEFAULT_EXPORT,
					'$1const __sfc_main = script\nexport { __sfc_main as default }',
				),
				// rollup-plugin-vue already emits an empty mapping for this
				// generated wrapper; keep it empty rather than claim a bogus one.
				map: { mappings: '' },
			}
		},
	}
}

export default {
	input: 'src/index.js',
	output: [
		{
			// Chunked ESM output (per bundle-tree-shaking-and-code-splitting):
			// `dir` + `preserveModules` (instead of a single `file` with
			// `inlineDynamicImports: true`) lets Rollup emit one chunk per
			// source module and keep the library's existing `import()` call
			// sites (CnObjectListWidget.vue, CnChartWidget.vue,
			// resolveManifestSentinels.js) as real async chunks, so a
			// consumer bundler's `usedExports` analysis can drop chunks the
			// consumer never imports instead of pulling in one indivisible
			// 9.9MB file.
			dir: 'dist/esm',
			format: 'es',
			preserveModules: true,
			preserveModulesRoot: 'src',
			sourcemap: true,
			// Only the entry chunk needs to pull in the extracted CSS —
			// `banner` runs per emitted chunk under preserveModules, and a
			// plain string banner would emit `import './nextcloud-vue.css'`
			// (a path relative to `dist/esm/nextcloud-vue.css`) from every
			// chunk, which resolves incorrectly for chunks nested in
			// subdirectories (e.g. `dist/esm/components/CnFoo/CnFoo.js`).
			banner: (chunk) => (chunk.isEntry ? "import './nextcloud-vue.css';" : ''),
		},
		{
			file: 'dist/nextcloud-vue.cjs.js',
			format: 'cjs',
			sourcemap: true,
			// CJS keeps single-file inlining — CJS has no standard
			// dynamic-chunk-loading convention and no fleet consumer builds
			// against this entry (all use webpack + the ESM `module` field).
			inlineDynamicImports: true,
		},
	],
	// `external` is a FUNCTION (not the usual string/regex array) because two
	// @nextcloud/* packages must be BUNDLED while every other @nextcloud/*
	// stays external. useAppInstaller.js (the dependency install-action)
	// imports @nextcloud/password-confirmation@5, which internally does
	// `import { spawnDialog } from '@nextcloud/dialogs'` — an export that only
	// exists in @nextcloud/dialogs ^6. 17 fleet consumer apps webpack-alias
	// @nextcloud/dialogs to their own older copy (v3.2.0 / v5.x); if these two
	// packages stayed external the consumer build would resolve `spawnDialog`
	// against that aliased <6 copy and fail with "spawnDialog was not found"
	// (empirically confirmed on larpingapp). Bundling password-confirmation
	// 5.3.2 + dialogs 6.4.2 here pins the exact combo that was live-verified on
	// NC34 (Vue 2.7 + @nextcloud/vue 8), so consumers keep their own dialogs
	// alias untouched and their build stays green. Everything else below
	// preserves the previous array's externals semantics verbatim.
	external: (id) => {
		// Bundle these two (and their subpaths, e.g. `/style.css`) into dist.
		if (/^@nextcloud\/(password-confirmation|dialogs)(\/|$)/.test(id)) {
			return false
		}
		return (
			id === 'vue'
			|| id === 'pinia'
			// Optional @mdi/js pack (loaded only by CnIconPicker's enriched MDI
			// source) — kept external so it stays lazy at the consumer and the
			// library ships no icon pack.
			|| id === '@mdi/js'
			// All other @nextcloud/* packages resolve at consumer build time.
			|| /^@nextcloud\//.test(id)
			|| /^vue-material-design-icons\//.test(id)
			// The Toast UI WYSIWYG editor (loaded only in CnMarkdownEditor's
			// `mode: 'wysiwyg'`) — kept external so it stays lazy at the consumer.
			|| /^@toast-ui\//.test(id)
			// `gridstack` is a peerDependency (package.json), not a bundled
			// dependency — MUST stay external. CnDashboardGrid's JS sets a CSS
			// custom property (`--gs-column-width`, v12+) that only GridStack's
			// OWN matching stylesheet reads. A consumer imports
			// `gridstack/dist/gridstack.min.css` from their own installed copy;
			// if this bundler vendored a *different* resolved copy of the JS
			// into dist (as it previously did — see dist/esm/node_modules/gridstack
			// before this fix), the vendored JS and the consumer's CSS could be
			// different majors and silently disagree, which is exactly how every
			// CnDashboardGrid item rendered at 0px width (nc-vue's own bundled
			// `^10.3.1` dependency vendored v10 JS underneath a consumer's v12
			// CSS import). Keeping `gridstack` external makes the compiled
			// output `import { GridStack } from 'gridstack'` a bare specifier,
			// so the consumer's bundler resolves it to the SAME single copy
			// whose CSS they import — the only way JS and CSS are guaranteed to
			// agree.
			|| id === 'gridstack'
			|| /^gridstack\//.test(id)
		)
	},
	plugins: [
		copyLeafletImages(),
		{
			name: 'resolve-apexcharts',
			resolveId(source) {
				if (source === 'apexcharts/dist/apexcharts.min') {
					return path.resolve(__dirname, 'node_modules/apexcharts/dist/apexcharts.min.js')
				}
				return null
			},
		},
		{
			// vue-demi (pulled in by vue-codemirror6 via CnJsonViewer, and by
			// @vueuse) resolves to its ESM entry `lib/index.mjs`, which does an
			// unguarded `import Vue from 'vue'; Vue.util.warn`. Two failure modes
			// stem from vue-demi's version-switch shipping the wrong variant in a
			// nested copy:
			//   1. The Vue-2.6 variant lacks `defineComponent`, so vue-codemirror6's
			//      `mG.defineComponent(...)` crashes at mount ("defineComponent is
			//      not a function").
			//   2. The `.cjs` re-exports Vue's named exports via a RUNTIME
			//      `Object.keys(require('vue'))` loop, which drops `defineComponent`
			//      when the external `vue` is provided as a bare constructor.
			// Since this library now targets Vue 3, pin every `vue-demi` copy to
			// its `lib/v3/index.mjs` variant — it does `import * as Vue from 'vue'`
			// and statically re-exports Vue 3's named exports (`defineComponent`
			// and friends), so a consumer bundling this dist gets a real
			// `defineComponent` regardless of its own vue interop shape. Pinning
			// the v2.7 variant here (a leftover from the Vue-2 line) is what made
			// the published dist crash at mount with "Cannot read properties of
			// undefined (reading 'defineComponent')" inside a Vue-3 consumer.
			// Falls back to the resolved id when the v3 variant is absent.
			name: 'resolve-vue-demi-v3',
			async resolveId(source, importer, options) {
				if (source !== 'vue-demi') {
					return null
				}
				const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
				if (!resolved || resolved.external) {
					return resolved
				}
				// e.g. .../vue-demi/lib/index.mjs → .../vue-demi/lib/v3/index.mjs
				const v3 = resolved.id.replace(/lib[/\\]index\.(mjs|cjs|js)$/, 'lib/v3/index.mjs')
				return (v3 !== resolved.id && fs.existsSync(v3)) ? { ...resolved, id: v3 } : resolved
			},
		},
		vue({ css: false }),
		// MUST come after vue() — it rewrites that plugin's generated trailer.
		anchorSfcDefaultExport(),
		postcss({ extract: 'nextcloud-vue.css', plugins: [postcssImport(), unwrapVueDeep()] }),
		json(),
		nodeResolve({ extensions: ['.mjs', '.js', '.json', '.node'] }),
		// `esmExternals: ['vue']` makes the commonjs plugin treat the external
		// `vue` as an ES module: a bundled CJS dependency's `require('vue')`
		// (notably vuedraggable's `Object(L.defineComponent)(...)`) is wired via
		// `import * as L from 'vue'` + namespace access, so `L.defineComponent`
		// resolves to Vue 3's real export in a consumer. Without it the CJS
		// default-interop left `L` undefined → "Cannot read properties of
		// undefined (reading 'defineComponent')" crash in a Vue-3 consumer.
		commonjs({ esmExternals: ['vue'] }),
	],
}
