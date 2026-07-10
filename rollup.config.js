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
			file: 'dist/nextcloud-vue.esm.js',
			format: 'es',
			sourcemap: true,
			inlineDynamicImports: true,
			banner: "import './nextcloud-vue.css';",
		},
		{
			file: 'dist/nextcloud-vue.cjs.js',
			format: 'cjs',
			sourcemap: true,
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
		)
	},
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
