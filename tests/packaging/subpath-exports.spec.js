/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Proof that the shared-tooling subpaths are actually IN the published package.
 *
 * WHY THIS EXISTS
 * ---------------
 * `2.1.0-vue3.9` shipped NEITHER `@conduction/nextcloud-vue/eslint` NOR
 * `@conduction/nextcloud-vue/testing/playwright`, because `package.json`'s
 * `files` allowlist did not list `eslint/`. Everything was green: the source
 * was on the branch, the tests passed, lint passed, the build passed, and
 * semantic-release published a version. The tarball simply had no such
 * directory in it, and the first consumer to `require()` the subpath got
 * MODULE_NOT_FOUND against a release that had reported success.
 *
 * That was the THIRD time in this programme a release went green and shipped
 * nothing useful. Every one of them shares a shape: the check ran against the
 * SOURCE TREE, where the file always exists, so it could not see the one thing
 * that was wrong. This test packs the package and looks inside the tarball —
 * the only artifact a consumer ever sees.
 *
 * HOW IT CANNOT FAKE A PASS
 * -------------------------
 * Every predicate here is exercised against a case that must FAIL as well as
 * one that must pass:
 *
 *  - `hasEntry()` is asserted true for a path that is certainly packed and
 *    false for one that certainly is not, so a matcher broken into always
 *    answering "yes" is caught;
 *  - `exportsOf()` is asserted to find the real symbol and NOT to find an
 *    invented one, so a require() that silently returned `{}` — or a
 *    `toContain` typo — is caught.
 *
 * Without those controls a green run here would mean nothing, which is exactly
 * how the releases it guards against went green.
 *
 * @jest-environment node
 */

const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const REPO = path.join(__dirname, '..', '..')

/** Subpaths a consumer imports, and the symbol that proves each one loaded. */
const PUBLISHED_SUBPATHS = [
	{
		subpath: 'eslint',
		entry: 'package/eslint/index.js',
		types: 'package/eslint/index.d.ts',
		symbol: 'conductionVue3Fixes',
		spelling: "require('@conduction/nextcloud-vue/eslint')",
	},
	{
		subpath: 'testing/playwright',
		entry: 'package/testing/playwright.js',
		types: 'package/testing/playwright.d.ts',
		symbol: 'seedSupportDialogSeen',
		spelling: "require('@conduction/nextcloud-vue/testing/playwright')",
	},
]

let workdir
let entries = []
let packageRoot

beforeAll(() => {
	workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'cn-pack-smoke-'))

	// `--ignore-scripts` keeps `prepare` (husky) out of the way; it does not
	// affect which files are selected, which is the whole subject here.
	const stdout = execFileSync(
		'npm',
		['pack', '--ignore-scripts', '--json', '--pack-destination', workdir],
		{ cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
	)
	const tarball = path.join(workdir, JSON.parse(stdout)[0].filename)

	entries = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)

	execFileSync('tar', ['-xzf', tarball, '-C', workdir])
	packageRoot = path.join(workdir, 'package')

	// The packed preset legitimately requires `eslint-plugin-vue` and
	// `vue-eslint-parser` (optional peers). Point the extracted package at this
	// repo's installed tree so `require()` resolves them the way a real
	// consumer's node_modules would — without that, "the module loads" would be
	// untestable and the symbol check would be reduced to a grep.
	fs.symlinkSync(path.join(REPO, 'node_modules'), path.join(packageRoot, 'node_modules'), 'junction')
}, 600000)

afterAll(() => {
	if (workdir) {
		fs.rmSync(workdir, { recursive: true, force: true })
	}
})

/**
 * Is this exact path inside the packed tarball?
 *
 * @param {string} name Tar entry path, e.g. `package/eslint/index.js`.
 * @return {boolean} True when packed.
 */
function hasEntry(name) {
	return entries.includes(name)
}

/**
 * The names a packed module actually exports, loaded from the EXTRACTED
 * tarball — never from the source tree.
 *
 * @param {string} relative Path within the package, e.g. `eslint/index.js`.
 * @return {string[]} Exported names.
 */
function exportsOf(relative) {
	// eslint-disable-next-line n/global-require
	const loaded = require(path.join(packageRoot, relative))
	return Object.keys(loaded)
}

describe('packaging — the tarball is not the source tree', () => {
	it('packs something at all', () => {
		expect(entries.length).toBeGreaterThan(0)
	})

	it('CONTROL: hasEntry() says yes to a file that is certainly packed', () => {
		expect(hasEntry('package/package.json')).toBe(true)
	})

	it('CONTROL: …and no to one that certainly is not', () => {
		// A matcher that answers "yes" to everything would sail through every
		// assertion below and re-ship the exact bug this file guards.
		expect(hasEntry('package/eslint/this-file-does-not-exist.js')).toBe(false)
		expect(hasEntry('package/tests/packaging/subpath-exports.spec.js')).toBe(false)
	})
})

describe.each(PUBLISHED_SUBPATHS)(
	'packaging — @conduction/nextcloud-vue/$subpath',
	({ entry, types, symbol, spelling }) => {
		it(`ships ${entry}`, () => {
			// This is the assertion that `2.1.0-vue3.9` would have failed: the
			// source file existed, the `files` allowlist did not mention its
			// directory, and the release published without it.
			expect(hasEntry(entry)).toBe(true)
		})

		it(`ships its type declarations (${types})`, () => {
			expect(hasEntry(types)).toBe(true)
		})

		it(`resolves ${symbol} from the packed file`, () => {
			expect(exportsOf(entry.replace(/^package\//, ''))).toContain(symbol)
		})

		it('CONTROL: does not resolve a symbol it never exported', () => {
			// Catches a require() that returned an empty object and a `toContain`
			// that was never actually discriminating.
			expect(exportsOf(entry.replace(/^package\//, ''))).not.toContain('__cnNotAnExport')
		})

		it(`is loadable the way the docs spell it — ${spelling}`, () => {
			const loaded = require(path.join(packageRoot, entry.replace(/^package\//, '')))
			expect(loaded[symbol]).toBeDefined()
		})
	},
)

describe('packaging — the packed code is the FIXED code', () => {
	it('ships an eslint preset that pins no numeric ecmaVersion', () => {
		// Read from the tarball, not from `eslint/index.js` on disk. A fix that
		// exists only in the working tree is the same class of failure as an
		// export that exists only in the working tree.
		const preset = require(path.join(packageRoot, 'eslint', 'index.js'))
		expect(preset.ECMA_LANGUAGE_LEVEL).toBe('latest')
		const layer = preset.conductionVue3Fixes.find((c) => c.name === 'conduction/language-level')
		expect(layer.languageOptions.ecmaVersion).toBe('latest')
		expect(layer.languageOptions.parserOptions.ecmaVersion).toBe('latest')
	})

	it('ships playwright helpers including the ones apps kept re-writing', () => {
		const helpers = require(path.join(packageRoot, 'testing', 'playwright.js'))
		for (const name of ['appDialog', 'retireFirstRunWizard', 'seedFirstVisitOverlaysSeen']) {
			expect(typeof helpers[name]).toBe('function')
		}
	})

	it('ships the storage prefixes consumers assert storageState against', () => {
		const helpers = require(path.join(packageRoot, 'testing', 'playwright.js'))
		expect(helpers.SUPPORT_DIALOG_STORAGE_PREFIX).toBe('cn-support-dialog-shown:')
		expect(helpers.WALKTHROUGH_STORAGE_PREFIX).toBe('cn-walkthrough-seen:')
	})

	it("refuses a persisting '*' seed when loaded FROM THE TARBALL", async () => {
		// The fix has to be in the artifact, not just in the repository.
		const { seedSupportDialogSeen } = require(path.join(packageRoot, 'testing', 'playwright.js'))
		const context = {
			async addInitScript() {},
			pages: () => [],
			async newPage() {},
			async storageState() { return { origins: [] } },
		}
		await expect(seedSupportDialogSeen(context, '*')).rejects.toThrow(/cannot be persisted/)
	})
})

describe('packaging — the files allowlist covers every published subpath', () => {
	it('lists each shipped tooling directory in package.json files', () => {
		const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'))
		// Belt and braces with the tarball assertions above: this one names the
		// exact key a future edit would have to touch, so the failure message
		// points at the cause rather than at the symptom.
		expect(pkg.files).toEqual(expect.arrayContaining(['eslint/', 'testing/']))
	})
})
