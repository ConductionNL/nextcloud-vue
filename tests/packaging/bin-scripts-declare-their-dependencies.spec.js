/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every command this package publishes must be able to run in a consumer.
 *
 * `bin.manifest-migrate` points at src/cli/manifest-migrate.js, which requires
 * `commander`. commander was a devDependency, and a consumer never installs a
 * package's devDependencies, so `npx manifest-migrate` in any app died with
 * `Cannot find module 'commander'` before printing a word.
 *
 * Same failure as the stylelint preset (#1081) and the marked / dompurify / dexie
 * peers (#1048): a file this package ships depended on something it did not
 * declare. So this reads the requires out of every published bin script rather
 * than naming commander, and a future CLI that pulls in a second devDependency
 * fails here instead of in somebody's terminal.
 */

const fs = require('fs')
const { builtinModules } = require('module')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

/**
 * The published bin scripts, as repo-relative paths.
 *
 * @return {string[]} One path per command.
 */
function binScripts() {
	if (!pkg.bin) {
		return []
	}
	return typeof pkg.bin === 'string' ? [pkg.bin] : Object.values(pkg.bin)
}

/**
 * Bare package names a script requires or imports, following its relative
 * requires so a helper module's dependencies count too.
 *
 * @param {string} entry Repo-relative path of the script.
 * @return {Set<string>} Package names, scope included.
 */
function packagesReachedFrom(entry) {
	const seen = new Set()
	const found = new Set()
	/**
	 * @param {string} file Absolute path to scan.
	 * @return {void}
	 */
	const visit = (file) => {
		if (seen.has(file) || !fs.existsSync(file)) {
			return
		}
		seen.add(file)
		const src = fs.readFileSync(file, 'utf8')
		const specs = [
			...src.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g),
			...src.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm),
		].map((m) => m[1])
		for (const spec of specs) {
			if (spec.startsWith('.')) {
				const base = path.resolve(path.dirname(file), spec)
				for (const candidate of [base, `${base}.js`, `${base}.cjs`, path.join(base, 'index.js')]) {
					if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
						visit(candidate)
						break
					}
				}
				continue
			}
			if (spec.startsWith('node:') || builtinModules.includes(spec.split('/')[0])) {
				continue
			}
			const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]
			found.add(name)
		}
	}
	visit(path.join(ROOT, entry))
	return found
}

describe('the commands this package publishes', () => {
	it('publishes at least one (precondition)', () => {
		// With no bin the loop below checks nothing and passes, which is the
		// shape of a test that cannot fail.
		expect(binScripts().length).toBeGreaterThan(0)
	})

	it('ships every bin script it names', () => {
		const missing = binScripts().filter((entry) => !fs.existsSync(path.join(ROOT, entry)))
		expect(missing).toEqual([])
	})

	// THE DEFECT. A package a published command needs at runtime has to be a
	// dependency. A devDependency is not installed for a consumer, and a peer is
	// the consumer's to provide, which is wrong for a tool the consumer only runs.
	it('declares every package a published command needs as a dependency', () => {
		const deps = pkg.dependencies || {}
		const undeclared = []
		for (const entry of binScripts()) {
			for (const name of packagesReachedFrom(entry)) {
				if (!deps[name]) {
					undeclared.push(`${entry} needs ${name}`)
				}
			}
		}
		expect(undeclared).toEqual([])
	})
})
