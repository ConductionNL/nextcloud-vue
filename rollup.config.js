import vue from 'rollup-plugin-vue'
import postcss from 'rollup-plugin-postcss'
import postcssImport from 'postcss-import'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
	external: [
		'vue',
		/^@nextcloud\//,
		'pinia',
		/^vue-material-design-icons\//,
		// Kept out of the bundle so they stay lazy at the consumer and the
		// library ships no icon pack: the Toast UI WYSIWYG editor (loaded only
		// in CnMarkdownEditor's `mode: 'wysiwyg'`) and the optional @mdi/js pack
		// (loaded only by CnIconPicker's enriched MDI source).
		/^@toast-ui\//,
		'@mdi/js',
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
		postcss({ extract: 'nextcloud-vue.css', plugins: [postcssImport()] }),
		json(),
		nodeResolve({ extensions: ['.mjs', '.js', '.json', '.node'] }),
		commonjs(),
	],
}
