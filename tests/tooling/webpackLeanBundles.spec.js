/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Proof for `withLeanBundles` in `@conduction/nextcloud-vue/webpack`.
 *
 * Measured on opencatalogi's prod build (25 Nov 2026): the shared nc-vue chunk
 * went from 15.3 MB to 5.9 MB once css-loader stopped embedding source maps and
 * the shared cache group stopped taking async chunks. These tests pin the
 * config transform; the byte numbers live in the PR.
 */

const fs = require('fs')
const path = require('path')
const { withLeanBundles } = require('../../webpack/index.js')

// The shape @nextcloud/webpack-vue-config ships, plus an app's shared groups.
function upstream() {
	return {
		devtool: 'source-map',
		module: {
			rules: [
				{ test: /\.css$/, use: ['style-loader', 'css-loader'] },
				{ test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
				{ test: /\.vue$/, loader: 'vue-loader' },
			],
		},
		optimization: {
			splitChunks: {
				chunks: 'all',
				cacheGroups: {
					default: false,
					ncVue: { name: 'app-shared-nc-vue', test: /nextcloud-vue/, enforce: true },
					vendor: { name: 'app-shared-vendor', test: /vue/, chunks: 'all' },
					lazyOnly: { test: /x/, chunks: 'async' },
				},
			},
		},
	}
}

describe('withLeanBundles', () => {
	it('turns css-loader source maps off in every rule', () => {
		const rules = withLeanBundles(upstream()).module.rules
		expect(rules[0].use).toEqual(['style-loader', { loader: 'css-loader', options: { sourceMap: false } }])
		expect(rules[1].use[1]).toEqual({ loader: 'css-loader', options: { sourceMap: false } })
		expect(rules[1].use[2]).toBe('sass-loader')
	})

	it('keeps the other css-loader options', () => {
		const config = { module: { rules: [{ test: /\.css$/, use: [{ loader: 'css-loader', options: { modules: true } }] }] } }
		expect(withLeanBundles(config).module.rules[0].use[0].options).toEqual({ modules: true, sourceMap: false })
	})

	it('handles a bare loader, a single use object and nested oneOf rules', () => {
		const config = {
			module: {
				rules: [
					{ test: /\.css$/, loader: 'css-loader' },
					{ test: /\.less$/, use: { loader: 'css-loader' } },
					{ oneOf: [{ test: /\.css$/, use: ['style-loader', 'css-loader'] }] },
				],
			},
		}
		const rules = withLeanBundles(config).module.rules
		expect(rules[0].options).toEqual({ sourceMap: false })
		expect(rules[1].use).toEqual([{ loader: 'css-loader', options: { sourceMap: false } }])
		expect(rules[2].oneOf[0].use[1]).toEqual({ loader: 'css-loader', options: { sourceMap: false } })
	})

	it('leaves rules without css-loader and the JavaScript devtool alone', () => {
		const result = withLeanBundles(upstream())
		expect(result.module.rules[2]).toEqual({ test: /\.vue$/, loader: 'vue-loader' })
		expect(result.devtool).toBe('source-map')
	})

	it('narrows groups that take all chunks to initial chunks', () => {
		const split = withLeanBundles(upstream()).optimization.splitChunks
		expect(split.chunks).toBe('initial')
		expect(split.cacheGroups.ncVue.chunks).toBe('initial')
		expect(split.cacheGroups.ncVue.name).toBe('app-shared-nc-vue')
		expect(split.cacheGroups.ncVue.enforce).toBe(true)
		expect(split.cacheGroups.vendor.chunks).toBe('initial')
	})

	it('leaves async-only groups and disabled groups as they are', () => {
		const split = withLeanBundles(upstream()).optimization.splitChunks
		expect(split.cacheGroups.lazyOnly.chunks).toBe('async')
		expect(split.cacheGroups.default).toBe(false)
	})

	it('does not touch a config without splitChunks', () => {
		const result = withLeanBundles({ entry: './x.js' })
		expect(result).toEqual({ entry: './x.js' })
	})

	it('does NOT mutate the config it was given', () => {
		const config = upstream()
		const before = JSON.stringify(config, (k, v) => (v instanceof RegExp ? String(v) : v))
		withLeanBundles(config)
		expect(JSON.stringify(config, (k, v) => (v instanceof RegExp ? String(v) : v))).toBe(before)
	})

	it('accepts the multi-compiler array form', () => {
		const [a, b] = withLeanBundles([upstream(), upstream()])
		expect(a.optimization.splitChunks.chunks).toBe('initial')
		expect(b.module.rules[0].use[1].options.sourceMap).toBe(false)
	})

	it('throws on a non-object', () => {
		expect(() => withLeanBundles(null)).toThrow(TypeError)
		expect(() => withLeanBundles('x')).toThrow(TypeError)
	})
})

describe('the lazy @mdi/js catalogue', () => {
	// An import() of '@mdi/js' marks every export of that module used, and the
	// app's own `import { mdiX } from '@mdi/js'` shares the module: the whole
	// pack landed in the app's main bundle (opencatalogi: 9.0 -> 4.9 MB once
	// the pickers import the CommonJS file instead).
	const files = [
		'src/components/CnIconBrowser/CnIconBrowserPanel.vue',
		'src/components/CnIconPicker/CnIconPicker.vue',
	]

	it.each(files)('%s lazy-loads the CommonJS file, not the package entry', (file) => {
		const source = fs.readFileSync(path.join(__dirname, '../..', file), 'utf8')
		expect(source).toMatch(/import\([^)]*'@mdi\/js\/commonjs\/mdi\.js'\)/)
		expect(source).not.toMatch(/import\([^)]*'@mdi\/js'\)/)
	})

	it('the CommonJS file is the one @mdi/js ships', () => {
		expect(fs.existsSync(require.resolve('@mdi/js/commonjs/mdi.js', { paths: [path.join(__dirname, '../..')] }))).toBe(true)
	})
})
