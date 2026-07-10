import vue from 'rollup-plugin-vue'
import postcss from 'rollup-plugin-postcss'
import postcssImport from 'postcss-import'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
	external: [
		'vue',
		/^@nextcloud\//,
		'pinia',
		/^vue-material-design-icons\//,
	],
	plugins: [
		{
			name: 'resolve-apexcharts',
			resolveId(source) {
				if (source === 'apexcharts/dist/apexcharts.min') {
					return path.resolve(__dirname, 'node_modules/apexcharts/dist/apexcharts.min.js')
				}
				return null
			},
		},
		vue({ css: false }),
		postcss({ extract: 'nextcloud-vue.css', plugins: [postcssImport(), unwrapVueDeep()] }),
		json(),
		nodeResolve({ extensions: ['.mjs', '.js', '.json', '.node'] }),
		commonjs(),
	],
}
