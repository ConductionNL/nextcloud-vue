/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @jest-environment node
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
const readBodyStyleOnce = require('../../webpack/body-style-once-loader.js')
const { NEXTCLOUD_VUE_BODY_STYLE_RULE, NEXTCLOUD_VUE_INDEX_RULE, withLeanBundles } = require('../../webpack/index.js')

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

	it('does not touch the optimization of a config without splitChunks', () => {
		const result = withLeanBundles({ entry: './x.js' })
		expect(result.entry).toBe('./x.js')
		expect(result.optimization).toBeUndefined()
		expect(result.module.rules).toEqual([NEXTCLOUD_VUE_INDEX_RULE, { ...NEXTCLOUD_VUE_BODY_STYLE_RULE, use: [...NEXTCLOUD_VUE_BODY_STYLE_RULE.use] }])
	})

	it('marks only the @nextcloud/vue index free of side effects, after the app rules', () => {
		const rules = withLeanBundles(upstream()).module.rules
		expect(rules).toHaveLength(5)
		expect(rules[3]).toEqual({ test: NEXTCLOUD_VUE_INDEX_RULE.test, sideEffects: false })
		const { test } = rules[3]
		expect(test.test('/app/node_modules/@nextcloud/vue/dist/index.mjs')).toBe(true)
		expect(test.test('C:\\app\\node_modules\\@nextcloud\\vue\\dist\\index.mjs')).toBe(true)
		expect(test.test('/app/node_modules/@nextcloud/vue/dist/chunks/NcButton-x.mjs')).toBe(false)
		expect(test.test('/app/node_modules/@nextcloud/vue/dist/components/NcButton/index.mjs')).toBe(false)
		expect(test.test('/app/node_modules/@conduction/nextcloud-vue/dist/esm/index.js')).toBe(false)
	})

	it('sends only NcSelect, NcSelectUsers and NcProgressBar through the body style loader', () => {
		const rules = withLeanBundles(upstream()).module.rules
		const rule = rules[4]
		expect(rule.test).toBe(NEXTCLOUD_VUE_BODY_STYLE_RULE.test)
		expect(rule.use).toEqual([path.join(__dirname, '..', '..', 'webpack', 'body-style-once-loader.js')])
		expect(fs.existsSync(rule.use[0])).toBe(true)
		for (const name of ['NcSelect', 'NcSelectUsers', 'NcProgressBar', 'NcSelect--kERLlBK', 'NcSelectUsers-K14Bepkq']) {
			expect(rule.test.test('/app/node_modules/@nextcloud/vue/dist/chunks/' + name + '.mjs')).toBe(true)
		}
		expect(rule.test.test('C:\\app\\node_modules\\@nextcloud\\vue\\dist\\chunks\\NcSelect.mjs')).toBe(true)
		expect(rule.test.test('/app/node_modules/@nextcloud/vue/dist/chunks/NcSelectTags.mjs')).toBe(false)
		expect(rule.test.test('/app/node_modules/@nextcloud/vue/dist/chunks/NcSelectTags-I2hJaNax.mjs')).toBe(false)
		expect(rule.test.test('/app/node_modules/@nextcloud/vue/dist/chunks/NcSelect.mjs.map')).toBe(false)
		expect(rule.test.test('/app/node_modules/@nextcloud/vue/dist/chunks/NcButton.mjs')).toBe(false)
		expect(rule.test.test('/app/node_modules/@conduction/nextcloud-vue/dist/esm/NcSelect.mjs')).toBe(false)
	})

	it('hands each config its own copy of the body style rule', () => {
		const a = withLeanBundles(upstream()).module.rules[4]
		a.use.push('other-loader')
		expect(withLeanBundles(upstream()).module.rules[4].use).toHaveLength(1)
		expect(NEXTCLOUD_VUE_BODY_STYLE_RULE.use).toHaveLength(1)
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

describe('one Nc* import from the @nextcloud/vue index', () => {
	// @nextcloud/vue 9 declares no sideEffects, so without the rule one
	// `import { NcButton } from '@nextcloud/vue'` bundled every component
	// (2.2 MB minified, emoji-mart and the date picker included).
	jest.setTimeout(120000)

	it('bundles that component only under withLeanBundles', async () => {
		const os = require('os')
		const webpack = require('webpack')
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-ncvue-'))
		fs.writeFileSync(path.join(dir, 'entry.mjs'), "import { NcButton } from '@nextcloud/vue'\nconsole.log(NcButton)\n")
		const root = path.join(__dirname, '../..')
		const config = withLeanBundles({
			context: dir,
			entry: path.join(dir, 'entry.mjs'),
			output: { path: path.join(dir, 'out'), filename: 'main.js' },
			mode: 'production',
			devtool: false,
			resolve: { modules: [path.join(root, 'node_modules')] },
			optimization: { minimize: false },
			// Everything but @nextcloud/vue itself stays outside the bundle.
			externals: ({ request }, callback) => (/^[^./]/.test(request) && !request.startsWith('@nextcloud/vue') ? callback(null, 'commonjs ' + request) : callback()),
			module: { rules: [{ test: /\.css$/, type: 'asset/resource' }] },
		})
		const stats = await new Promise((resolve, reject) => webpack(config).run((err, result) => (err ? reject(err) : resolve(result))))
		expect(stats.hasErrors()).toBe(false)
		const bundle = fs.readFileSync(path.join(dir, 'out', 'main.js'), 'utf8')
		expect(bundle).toContain('button-vue')
		expect(bundle).not.toMatch(/NcEmojiPicker|NcDateTimePicker\b|NcRichText/)
		expect(bundle.length).toBeLessThan(200000)
		fs.rmSync(dir, { recursive: true, force: true })
	})
})

describe('the body style loader', () => {
	const NC_SELECT = 'const avatarSize = Number.parseInt(window.getComputedStyle(document.body).getPropertyValue("--default-clickable-area")) - 2 * Number.parseInt(window.getComputedStyle(document.body).getPropertyValue(\'--default-grid-baseline\'));\nexport { avatarSize };\n'

	/**
	 * Evaluate a chunk with a counting getComputedStyle.
	 *
	 * @param {string} source The chunk
	 * @return {{ result: number, reads: number }} The avatar size and the style reads
	 */
	function run(source) {
		let reads = 0
		const values = { '--default-clickable-area': '34px', '--default-grid-baseline': '4px' }
		const window = {
			getComputedStyle: () => {
				reads++
				return { getPropertyValue: (name) => values[name] }
			},
		}
		const result = new Function('window', 'document', source.replace('export { avatarSize };', 'return avatarSize;'))(window, { body: {} })
		return { result, reads }
	}

	afterEach(() => {
		delete globalThis.__cnBodyStyleValues
	})

	it('rewrites both quote styles to the per-page memo', () => {
		const out = readBodyStyleOnce(NC_SELECT)
		expect(out).toContain('__cnBodyStyleValue("--default-clickable-area")')
		expect(out).toContain("__cnBodyStyleValue('--default-grid-baseline')")
		expect(out).not.toContain('getPropertyValue("--')
		expect(out).not.toContain("getPropertyValue('--")
	})

	it('computes the same avatar size, reading each property once per page', () => {
		const chunk = readBodyStyleOnce(NC_SELECT)
		expect(run(chunk).result).toBe(run(NC_SELECT).result)
		delete globalThis.__cnBodyStyleValues
		expect([1, 2, 3, 4, 5].map(() => run(chunk).reads)).toEqual([2, 0, 0, 0, 0])
		expect(run(NC_SELECT).reads).toBe(2)
	})

	it('leaves a chunk without body style reads unchanged, and is stable across runs', () => {
		const other = 'const x = window.getComputedStyle(el).getPropertyValue("--a");\n'
		expect(readBodyStyleOnce(other)).toBe(other)
		expect(readBodyStyleOnce(NC_SELECT)).toBe(readBodyStyleOnce(NC_SELECT))
	})

	it('matches what @nextcloud/vue ships today', () => {
		const dir = path.join(__dirname, '..', '..', 'node_modules', '@nextcloud', 'vue', 'dist', 'chunks')
		const file = fs.readdirSync(dir).find((name) => NEXTCLOUD_VUE_BODY_STYLE_RULE.test.test(path.join(dir, name)) && name.startsWith('NcSelect') && !name.startsWith('NcSelectUsers'))
		const chunk = fs.readFileSync(path.join(dir, file), 'utf8')
		expect(readBodyStyleOnce(chunk)).not.toContain('getComputedStyle(document.body).getPropertyValue("--')
		expect(readBodyStyleOnce(chunk)).toContain('__cnBodyStyleValue("--default-clickable-area")')
	})
})

describe('withLeanBundles: chunks functions', () => {
	const initial = { name: 'main', canBeInitial: () => true }
	const lazy = { name: 'icons', canBeInitial: () => false }
	const leaves = { name: 'leaves', canBeInitial: () => true }
	const config = () => ({
		module: { rules: [] },
		optimization: {
			splitChunks: {
				chunks: (chunk) => chunk.name !== 'leaves',
				cacheGroups: {
					ncVue: { name: 'app-shared-nc-vue', test: /nextcloud-vue/ },
					own: { test: /x/, chunks: (chunk) => chunk.name !== 'leaves' },
					lazyOnly: { test: /y/, chunks: 'async' },
				},
			},
		},
	})

	it('keeps the app filter and refuses async chunks, at the top level and per group', () => {
		const split = withLeanBundles(config()).optimization.splitChunks
		for (const select of [split.chunks, split.cacheGroups.own.chunks]) {
			expect(select(initial)).toBe(true)
			expect(select(lazy)).toBe(false)
			expect(select(leaves)).toBe(false)
		}
		expect(split.cacheGroups.lazyOnly.chunks).toBe('async')
		expect(split.cacheGroups.ncVue.chunks).toBeUndefined()
	})

	it('wraps a function once, when applied twice', () => {
		const once = withLeanBundles(config()).optimization.splitChunks.chunks
		const twice = withLeanBundles(withLeanBundles(config())).optimization.splitChunks.chunks
		expect(twice.cnInitialOnly).toBe(true)
		expect(twice.toString()).toBe(once.toString())
	})
})
