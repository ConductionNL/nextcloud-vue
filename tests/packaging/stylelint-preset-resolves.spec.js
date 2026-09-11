/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The stylelint preset this package publishes has to load.
 *
 * `@conduction/nextcloud-vue/stylelint` extends `@nextcloud/stylelint-config`.
 * Until this file existed the package declared that dependency nowhere, so
 * `require('@conduction/nextcloud-vue/stylelint')` threw MODULE_NOT_FOUND in any
 * app that did not happen to install it itself. Nothing here noticed, because
 * this repository linted itself with a different config and never loaded the
 * one it shipped.
 *
 * That is the same failure as the `marked` / `dompurify` / `dexie` peers fixed in
 * #1048: a file this package ships depends on something this package does not
 * declare. The shape of the guard is the same too. It reads what the preset
 * EXTENDS rather than hard-coding a name, so a preset that grows a second
 * `extends` entry is checked without anyone remembering to add it here.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const preset = require(path.join(ROOT, 'stylelint', 'index.js'))

/**
 * The preset's `extends` as a list, whatever shape it was written in.
 *
 * @return {string[]} Package names the preset extends.
 */
function extendsOf() {
	const e = preset.extends
	if (!e) return []
	return Array.isArray(e) ? e : [e]
}

describe('the published stylelint preset', () => {
	it('is exported where the docs say it is', () => {
		// The subpath an app requires. Without it the rest of this file is
		// testing a file nobody can reach.
		expect(pkg.exports['./stylelint']).toBe('./stylelint/index.js')
		expect(pkg.files).toContain('stylelint/')
	})

	it('extends at least one shared config (precondition)', () => {
		// Every check below iterates this list. Empty, they would all pass.
		expect(extendsOf().length).toBeGreaterThan(0)
	})

	// THE DEFECT. Each package the preset extends must be declared, so npm can
	// install it for a consumer. A peer is the honest declaration here, not a
	// dependency: the preset is an opt-in subpath that only stylelint loads, so
	// an app that never lints with it should not download stylelint tooling.
	// That is exactly how the ESLint preset's tooling is already declared.
	it('declares every config it extends as a peer', () => {
		const undeclared = extendsOf().filter((name) => !(pkg.peerDependencies || {})[name])
		expect(undeclared).toEqual([])
	})

	it('marks those peers optional, as the ESLint preset does', () => {
		const meta = pkg.peerDependenciesMeta || {}
		const notOptional = extendsOf().filter((name) => !(meta[name] && meta[name].optional))
		expect(notOptional).toEqual([])
		// stylelint itself too: the preset is meaningless without it.
		expect(meta.stylelint && meta.stylelint.optional).toBe(true)
	})

	// The whole point: it RESOLVES. Declaring a peer satisfies the check above
	// and still fails a consumer if the range points at a version that does not
	// exist or is not installed, so resolve it for real.
	it('resolves every config it extends from this package', () => {
		const missing = []
		for (const name of extendsOf()) {
			try {
				require.resolve(`${name}/package.json`, { paths: [ROOT] })
			} catch {
				missing.push(name)
			}
		}
		expect(missing).toEqual([])
	})

	// A preset its publisher does not run is a preset nobody tests. This is what
	// kept the missing dependency invisible, so pin it: the repository's own
	// config must BE the published preset.
	it('is the config this repository lints itself with', () => {
		const own = require(path.join(ROOT, 'stylelint.config.js'))
		expect(own).toBe(preset)
	})
})
