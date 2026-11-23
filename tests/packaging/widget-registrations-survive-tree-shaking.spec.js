/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every module that registers a dashboard widget type is kept by the
 * package's `sideEffects` allowlist.
 *
 * The registrar pulls registrations in with bare `import '...'` statements.
 * A bare import of a module the allowlist calls side-effect free is dropped
 * by the build, and the type it registers is unknown at runtime: the widget
 * renders nothing and nothing reports it. CnMailTab/index.js was such a
 * module, so the `mail` widget never reached an app's bundle.
 *
 * @spec openspec/changes/mail-widget-kept-in-dist/specs/widget-registration/spec.md
 */
const fs = require('fs')
const path = require('path')
const picomatch = require('picomatch')

const ROOT = path.resolve(__dirname, '../..')
const SRC = path.join(ROOT, 'src')
const sideEffects = require('../../package.json').sideEffects
const kept = picomatch(sideEffects, { dot: true })

/**
 * List the JS modules under a directory.
 *
 * @param {string} dir The directory.
 * @return {string[]} Absolute paths.
 */
function jsFiles(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			return entry.name === '__tests__' ? [] : jsFiles(full)
		}
		return entry.name.endsWith('.js') ? [full] : []
	})
}

const registering = jsFiles(SRC).filter((file) => /\bregisterDashboardWidget\(\s*['"]/.test(fs.readFileSync(file, 'utf8')))

describe('dashboard widget registrations survive tree shaking', () => {
	it('finds the registering modules', () => {
		expect(registering.length).toBeGreaterThan(0)
	})

	it.each(registering.map((file) => path.relative(ROOT, file)))('%s is kept by sideEffects', (file) => {
		expect(kept(file)).toBe(true)
	})

	it('registers the mail widget through a kept module', () => {
		const mail = registering.map((file) => path.relative(ROOT, file)).filter((file) => fs.readFileSync(path.join(ROOT, file), 'utf8').match(/registerDashboardWidget\(\s*['"]mail['"]/))
		expect(mail).toHaveLength(1)
		expect(kept(mail[0])).toBe(true)
	})
})
