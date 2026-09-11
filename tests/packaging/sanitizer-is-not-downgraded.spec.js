/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The HTML sanitizer that runs in a consumer's browser must not be a 2.x copy.
 *
 * `@toast-ui/editor` depends on `dompurify@^2.3.3`, so installing it brings a
 * SECOND sanitizer into the tree beside the 3.x this library declares. That
 * nested copy carried fifteen open XSS advisories, and it is the copy that
 * actually sanitizes what a user types into the markdown editor. The library's
 * own dompurify being current said nothing about it.
 *
 * An `overrides` entry collapses the two onto one version. This asserts the
 * outcome rather than the mechanism: it reads the installed tree, so any other
 * way of reaching one current sanitizer also passes, and removing the override
 * without replacing it fails here instead of in a consumer's browser.
 *
 * WHY A TEST AND NOT `npm audit`. Audit reports whatever is newly disclosed, so
 * a clean audit today says nothing about tomorrow's tree. The invariant worth
 * pinning is narrower and permanent: there is exactly one dompurify major in
 * the tree, and it is 3.
 *
 * An audit assertion was written here first and removed, because it could not
 * fail. Inside a jest run npm has to be told `--offline`, and an offline audit
 * cannot reach the advisory registry, so it reports zero findings whatever is
 * installed: it passed with the vulnerable 2.5.9 copy sitting in the tree.
 * Auditing belongs in CI, against the network, which already has a gate.
 *
 * The version floor is deliberately a MAJOR, not the latest patch. Pinning the
 * patch here would make this file fail every time a new dompurify advisory is
 * published, which is noise rather than signal: patch currency is audit's job,
 * and it already has a gate.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')

/**
 * Every installed copy of a package in the tree, by resolved version.
 *
 * Walks `node_modules` rather than asking npm, so it sees nested copies as
 * distinct and needs no network. A package absent from the tree yields an empty
 * list, which the tests below treat as a skip rather than a pass.
 *
 * @param {string} name The package name to find.
 * @return {Array<{dir: string, version: string}>} One entry per installed copy.
 */
function installedCopies(name) {
	const found = []
	/**
	 * @param {string} dir A `node_modules` directory to search.
	 * @return {void}
	 */
	const walk = (dir) => {
		if (!fs.existsSync(dir)) return
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue
			const full = path.join(dir, entry.name)
			// Scoped packages hold their own directory level.
			if (entry.name.startsWith('@')) {
				walk(full)
				continue
			}
			const manifest = path.join(full, 'package.json')
			if (fs.existsSync(manifest)) {
				try {
					const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'))
					if (pkg.name === name && pkg.version) found.push({ dir: full, version: pkg.version })
				} catch {
					// An unreadable manifest is not this test's business.
				}
			}
			walk(path.join(full, 'node_modules'))
		}
	}
	walk(path.join(ROOT, 'node_modules'))
	return found
}

describe('the sanitizer that reaches a consumer', () => {
	const copies = installedCopies('dompurify')

	it('is installed at all (precondition)', () => {
		// Every assertion below is about which versions exist. With none
		// installed they would all pass while proving nothing, which is the
		// shape of a test that cannot fail.
		expect(copies.length).toBeGreaterThan(0)
	})

	it('has no 2.x copy anywhere in the tree', () => {
		const old = copies.filter((c) => Number(c.version.split('.')[0]) < 3)
		expect(old.map((c) => `${c.version} at ${path.relative(ROOT, c.dir)}`)).toEqual([])
	})

	// One copy, not merely no old copy. Two 3.x copies would pass the check
	// above and still mean the editor sanitizes with a different build from the
	// rest of the library, which is how the 2.x copy went unnoticed.
	it('resolves to a single version', () => {
		expect([...new Set(copies.map((c) => c.version))]).toHaveLength(1)
	})

	// The markdown editor is the component whose sanitizer this is, and it
	// loads Toast UI lazily, so nothing else in the suite pulls this path.
	it('is the version the markdown editor will load', () => {
		const editor = installedCopies('@toast-ui/editor')
		if (!editor.length) {
			throw new Error('@toast-ui/editor is not installed, so this guard cannot check the editor path')
		}
		const nested = path.join(editor[0].dir, 'node_modules', 'dompurify')
		// Either deduped to the root copy, or nested but still 3.x.
		if (fs.existsSync(nested)) {
			const v = JSON.parse(fs.readFileSync(path.join(nested, 'package.json'), 'utf8')).version
			expect(Number(v.split('.')[0])).toBeGreaterThanOrEqual(3)
		} else {
			expect(copies.length).toBeGreaterThan(0)
		}
	})
})

describe('the declared sanitizer range', () => {
	const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

	// The override exists to drag a THIRD PARTY's pin forward. Writing it as a
	// literal version would let it drift behind the dependency it is meant to
	// match, so it references ours and the two can never disagree.
	it('keeps the override tied to our own dependency rather than a literal', () => {
		const override = (pkg.overrides || {}).dompurify
		expect(override).toBe('$dompurify')
	})

	it('declares a 3.x floor for consumers', () => {
		const peer = (pkg.peerDependencies || {}).dompurify
		expect(peer).toBeTruthy()
		// A consumer bringing 2.x would reintroduce exactly what the override
		// removes, through the front door.
		expect(peer).toMatch(/\^?3\./)
	})
})
