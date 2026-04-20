import vue from 'rollup-plugin-vue'
import postcss from 'rollup-plugin-postcss'
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
		postcss({ extract: 'nextcloud-vue.css' }),
		json(),
		nodeResolve({ extensions: ['.mjs', '.js', '.json', '.node'] }),
		commonjs(),
	],
}
