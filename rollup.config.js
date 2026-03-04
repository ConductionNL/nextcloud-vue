import vue from 'rollup-plugin-vue'
import postcss from 'rollup-plugin-postcss'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default {
	input: 'src/index.js',
	output: [
		{
			file: 'dist/nextcloud-vue.esm.js',
			format: 'es',
			sourcemap: true,
		},
		{
			file: 'dist/nextcloud-vue.cjs.js',
			format: 'cjs',
			sourcemap: true,
		},
	],
	external: [
		'vue',
		/^@nextcloud\//,
		'pinia',
		/^vue-material-design-icons\//,
	],
	plugins: [
		vue({ css: false }),
		postcss({ extract: 'nextcloud-vue.css' }),
		nodeResolve(),
		commonjs(),
	],
}
