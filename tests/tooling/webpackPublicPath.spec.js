/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Proof for `@conduction/nextcloud-vue/webpack`.
 *
 * The bug this helper fixes reports as an HTTP 200: Nextcloud answers an
 * unmatched path with the web UI, so a chunk requested at the wrong prefix
 * comes back as `text/html` and the browser refuses it on MIME grounds. The
 * only thing a unit test can pin is that the config transform writes the right
 * value and does not mutate the shared upstream object it was handed.
 */

const { AUTO_PUBLIC_PATH, withPublicPath } = require('../../webpack/index.js')

describe('withPublicPath', () => {
	it('sets output.publicPath to "auto"', () => {
		const result = withPublicPath({ entry: './src/main.js' })
		expect(result.output.publicPath).toBe('auto')
	})

	it('exports the same value it writes', () => {
		expect(withPublicPath({}).output.publicPath).toBe(AUTO_PUBLIC_PATH)
	})

	it('overwrites the hardcoded /apps/<app>/js/ prefix', () => {
		// This is the shape @nextcloud/webpack-vue-config ships.
		const upstream = { output: { path: '/build/js', filename: '[name].js', publicPath: '/apps/openregister/js/' } }
		expect(withPublicPath(upstream).output.publicPath).toBe('auto')
	})

	it('preserves every other output key', () => {
		const upstream = { output: { path: '/build/js', filename: '[name].js', chunkFilename: '[id].js' } }
		const result = withPublicPath(upstream)
		expect(result.output.path).toBe('/build/js')
		expect(result.output.filename).toBe('[name].js')
		expect(result.output.chunkFilename).toBe('[id].js')
	})

	it('preserves every other top-level key', () => {
		const upstream = { entry: { main: './src/main.js' }, module: { rules: [] }, plugins: ['p'] }
		const result = withPublicPath(upstream)
		expect(result.entry).toEqual({ main: './src/main.js' })
		expect(result.module).toEqual({ rules: [] })
		expect(result.plugins).toEqual(['p'])
	})

	it('does NOT mutate the config it was given', () => {
		// @nextcloud/webpack-vue-config is a shared module instance. A config
		// file that mutates it changes the object every other require() of it
		// sees in the same build.
		const upstream = { output: { publicPath: '/apps/openregister/js/' } }
		withPublicPath(upstream)
		expect(upstream.output.publicPath).toBe('/apps/openregister/js/')
	})

	it('works on a config with no output block at all', () => {
		expect(withPublicPath({ entry: './x.js' }).output).toEqual({ publicPath: 'auto' })
	})

	it('handles the multi-compiler array form', () => {
		const result = withPublicPath([{ name: 'a' }, { name: 'b', output: { filename: 'b.js' } }])
		expect(result.map((c) => c.output.publicPath)).toEqual(['auto', 'auto'])
		expect(result[1].output.filename).toBe('b.js')
	})

	it('accepts an explicit override for the rare case you truly know the prefix', () => {
		expect(withPublicPath({}, { publicPath: '/custom_apps/foo/js/' }).output.publicPath)
			.toBe('/custom_apps/foo/js/')
	})

	it('rejects a non-config argument instead of silently producing one', () => {
		expect(() => withPublicPath(null)).toThrow(TypeError)
		expect(() => withPublicPath('webpack.config.js')).toThrow(/expects a webpack config/)
	})
})
