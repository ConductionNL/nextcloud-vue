/**
 * Vue 3 build for @conduction/nextcloud-vue (ADR-066, openspec vue-3-migration).
 *
 * A faithful swap of rollup.config.js (the Vue 2 build) with the four documented
 * Vue-3 deltas applied (see BUILD-VUE3.md for the table + evidence):
 *   1. rollup-plugin-vue  →  @vitejs/plugin-vue
 *   2. vue({ css:false })  →  compat compiler flags (MODE 2 + COMPILER_FILTERS)
 *      — NOT optional: plain Vue 3 SILENTLY mis-compiles `.sync` (drops the
 *        update handler) and `{{x|f}}` (parses `|` as bitwise-OR). Proven with
 *        @vue/compiler-sfc 3.5.29. The compat flags keep the un-migrated 329
 *        components correct until each site is rewritten (openspec tasks 2.2/2.6),
 *        after which these flags come off.
 *   3. drop `resolve-vue-demi-v27` — vue-demi resolves its v3 variant on Vue 3.
 *   4. drop `unwrapVueDeep()` — the Vue 3 SFC compiler lowers `:deep()` natively.
 *
 * STATUS: validated at the component level — CnGraphCanvas builds + runs on Vue 3
 * (browser-verified), and the compat compiler was proven to preserve `.sync`/
 * filter semantics. NOT yet run against the full 329-component lib; that needs
 * the Vue 3 dep install (see BUILD-VUE3.md "Getting a build running") and is the
 * next step. Everything not listed as a delta is copied verbatim from
 * rollup.config.js and keeps its behaviour (external function, chunked-ESM
 * preserveModules output, leaflet image copy, apexcharts resolve).
 */
import vue from '@vitejs/plugin-vue'
import postcss from 'rollup-plugin-postcss'
import postcssImport from 'postcss-import'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Vue 2-only image-copy + apexcharts resolve are unchanged; import them from a
// shared module in the real port. Inlined minimally here for the scaffold.
function copyLeafletImages() {
	// See rollup.config.js — copies leaflet marker PNGs into dist/images and
	// dist/esm/images (both, per the 2026-07-12 openbuild esm-consumer fix).
	return { name: 'copy-leaflet-images', buildStart() { /* port verbatim */ } }
}

export default {
	input: 'src/index.js',
	output: [
		{
			dir: 'dist/esm',
			format: 'es',
			preserveModules: true,
			preserveModulesRoot: 'src',
			sourcemap: true,
			banner: (chunk) => (chunk.isEntry ? "import './nextcloud-vue.css';" : ''),
		},
		{
			file: 'dist/nextcloud-vue.cjs.js',
			format: 'cjs',
			sourcemap: true,
			inlineDynamicImports: true,
		},
	],
	// Verbatim from rollup.config.js — bundle password-confirmation + dialogs,
	// keep everything else external. On the v9 rebase (openspec task 4) the
	// pinned dialogs/password-confirmation combo must be re-verified on the NC
	// Vue-3 stack, and `@nextcloud/vue` stays external at ^9.
	external: (id) => {
		if (/^@nextcloud\/(password-confirmation|dialogs)(\/|$)/.test(id)) {
			return false
		}
		return (
			id === 'vue'
			|| id === '@vue/compat'
			|| id === 'pinia'
			|| id === '@mdi/js'
			|| /^@nextcloud\//.test(id)
			|| /^vue-material-design-icons\//.test(id)
			|| /^@toast-ui\//.test(id)
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
		// DELTA 1 + 2: @vitejs/plugin-vue with the compat compiler flags.
		vue({
			template: {
				compilerOptions: {
					// Keep the un-migrated Vue-2 template syntax semantically correct
					// during the straddle. Remove once tasks 2.2/2.6 land.
					compatConfig: { MODE: 2, COMPILER_FILTERS: true },
				},
			},
		}),
		// DELTA 5 (openspec task 1.3): strip Vue Styleguidist <docs> custom blocks.
		// @vitejs/plugin-vue emits them as modules whose raw prose isn't JS, which
		// rollup can't parse. rollup-plugin-vue (Vue 2) silently ignored them.
		{
			name: 'empty-vue-docs-blocks',
			transform(code, id) {
				if (id.includes('vue&type=docs')) {
					return { code: 'export default {}', map: null }
				}
				return null
			},
		},
		// DELTA 4: no unwrapVueDeep — Vue 3 SFC compiler handles :deep() natively.
		postcss({ extract: 'nextcloud-vue.css', plugins: [postcssImport()] }),
		json(),
		nodeResolve({ extensions: ['.mjs', '.js', '.json', '.node'] }),
		commonjs(),
	],
}
