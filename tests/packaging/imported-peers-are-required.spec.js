/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A peer this library imports STATICALLY cannot be optional.
 *
 * `peerDependenciesMeta.<name>.optional` tells npm not to install the package
 * and not to warn when it is missing. That is only honest when the library can
 * run without it. Four components import `marked` and `dompurify` at the top
 * level, so a consumer that does not already have them fails to resolve at
 * BUILD time — with a bare "Module not found" naming a package they never
 * asked for.
 *
 * Shipped that way in 2.42.0: both moved from `dependencies` to OPTIONAL
 * peers, while the imports stayed exactly as they were. dossiq only survived
 * the upgrade because it happens to declare both itself.
 *
 * This walks the actual source for static imports rather than hard-coding the
 * two names, so a future component that imports a third optional peer fails
 * here instead of in a consumer's build.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const SRC = path.join(ROOT, 'src')
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

/**
 * Every `.vue` / `.js` / `.ts` file under `src/`.
 *
 * @param {string} dir Directory to walk.
 * @return {string[]} Absolute file paths.
 */
function sourceFiles(dir) {
	const out = []
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			out.push(...sourceFiles(full))
		} else if (/\.(vue|js|ts)$/.test(entry.name)) {
			out.push(full)
		}
	}
	return out
}

/**
 * Bare module specifiers imported statically anywhere under `src/`.
 *
 * Only `import … from 'x'` counts. A dynamic `import('x')` is deliberately
 * excluded: that form CAN be guarded, and guarding it is the other legitimate
 * way to make an optional peer honest.
 *
 * @return {Set<string>} Package names.
 */
function staticallyImportedPackages() {
	const found = new Set()
	const pattern = /^\s*import\s[^'"]*from\s+['"]([^'"./][^'"]*)['"]/gm
	for (const file of sourceFiles(SRC)) {
		const text = fs.readFileSync(file, 'utf8')
		let m
		while ((m = pattern.exec(text)) !== null) {
			const spec = m[1]
			// Reduce "@scope/name/sub" and "name/sub" to the package name.
			const parts = spec.split('/')
			found.add(spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0])
		}
	}
	return found
}

describe('packaging — a statically imported peer is not optional', () => {
	const optionalPeers = Object.entries(pkg.peerDependenciesMeta || {})
		.filter(([, meta]) => meta && meta.optional)
		.map(([name]) => name)

	it('marked and dompurify are declared as required peers', () => {
		expect(optionalPeers).not.toContain('marked')
		expect(optionalPeers).not.toContain('dompurify')
		expect(pkg.peerDependencies.marked).toBeDefined()
		expect(pkg.peerDependencies.dompurify).toBeDefined()
	})

	it('no optional peer is imported statically from src/', () => {
		const imported = staticallyImportedPackages()
		const offenders = optionalPeers.filter((name) => imported.has(name))
		expect(offenders).toEqual([])
	})

	// The guard above is only meaningful if the walker actually sees these
	// imports. Without this, deleting the regex would make the suite green.
	it('the import walker really finds marked and dompurify (precondition)', () => {
		const imported = staticallyImportedPackages()
		expect(imported.has('marked')).toBe(true)
		expect(imported.has('dompurify')).toBe(true)
	})

	it('the marked range covers every major the fleet is on', () => {
		// opencatalogi is on 12, every other app on 18. Both must fall inside
		// the range, or one half of the fleet cannot install the library.
		//
		// The bounds are read out of the declared range rather than fed to
		// semver: semver is not a dependency here, and requiring it for one
		// assertion would add a package to satisfy a test.
		const range = pkg.peerDependencies.marked
		const bounds = range.match(/^>=(\d+) <(\d+)$/)
		expect(bounds).not.toBeNull()
		const [, lowest, exclusiveUpper] = bounds
		expect(Number(lowest)).toBeLessThanOrEqual(12)
		expect(Number(exclusiveUpper)).toBeGreaterThan(18)
	})
})
