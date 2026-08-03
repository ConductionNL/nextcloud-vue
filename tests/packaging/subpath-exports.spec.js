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
 * WHAT ELSE IT NOW CHECKS
 * -----------------------
 * The same "look inside the artifact" method also answers a question the
 * source tree cannot: does any module we publish as ESM still reach for
 * CommonJS? See the `dist/esm` describe block near the bottom — a
 * `require('@nextcloud/vue')` in `dist/esm/composables/cnFormFieldRenderer.js`
 * left `NcTextArea` permanently null in every consumer, with no runtime error,
 * for as long as it shipped.
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
	{
		// `webpack/` is a NEW top-level directory, which means a NEW line in the
		// `files` allowlist — the exact omission that made 2.1.0-vue3.9 ship an
		// `eslint` subpath that did not exist. Pinned here from the first
		// release that carries it.
		subpath: 'webpack',
		entry: 'package/webpack/index.js',
		types: 'package/webpack/index.d.ts',
		symbol: 'withPublicPath',
		spelling: "require('@conduction/nextcloud-vue/webpack')",
	},
]

/**
 * Symbols added to an EXISTING packed subpath. A directory already in `files`
 * cannot fail the allowlist check, but it can still ship without the symbol a
 * consumer was told to import — a stale build, a missed export line. Each entry
 * is required out of the extracted tarball.
 */
const PUBLISHED_SYMBOLS = [
	{ subpath: 'testing/playwright', relative: 'testing/playwright.js', symbol: 'resolveBaseUrl' },
	{ subpath: 'testing/playwright', relative: 'testing/playwright.js', symbol: 'absoluteUrl' },
	{ subpath: 'testing/playwright', relative: 'testing/playwright.js', symbol: 'baseUrlParts' },
	{ subpath: 'eslint', relative: 'eslint/index.js', symbol: 'vueInvertedVue2Rules' },
]

let workdir
let entries = []
let packageRoot

beforeAll(() => {
	workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'cn-pack-smoke-'))

	// The `dist/esm/**` assertions below are worthless against a tarball with
	// no `dist/` in it — "no file contains X" is trivially true when there are
	// no files, which is the exact shape of the wrong answers this file exists
	// to prevent. `npm pack` never builds, so build on demand when dist is
	// missing (fresh clone, `npx jest` without `pretest`, CI ordering change).
	if (!fs.existsSync(path.join(REPO, 'dist', 'esm', 'index.js'))) {
		execFileSync('npm', ['run', 'build'], { cwd: REPO, stdio: 'inherit' })
	}

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
 * `major.minor` of a semver string.
 *
 * @param {string} version Version string.
 * @return {string} e.g. `'1.8'`.
 */
function semverMajorMinor(version) {
	return String(version).split('.').slice(0, 2).join('.')
}

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

describe.each(PUBLISHED_SYMBOLS)(
	'packaging — $subpath exports $symbol',
	({ relative, symbol }) => {
		it('is present in the packed module', () => {
			expect(exportsOf(relative)).toContain(symbol)
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

/**
 * Every CommonJS `require` call site in a chunk of source.
 *
 * Deliberately matched on the RAW text, comments and string literals
 * included. A comment-aware scanner would have to model strings, template
 * literals and regex literals to be correct, and every bug in it produces a
 * FALSE NEGATIVE — a "no require calls here" answer manufactured by a broken
 * lookup, which is the single failure mode this suite exists to rule out. A
 * false positive, by contrast, is a maintainer being told to reword a comment.
 * The trade is deliberate: write the word without the opening parenthesis.
 *
 * @param {string} source JavaScript source text.
 * @return {string[]} The matched call openings (one per occurrence).
 */
function requireCallsIn(source) {
	return source.match(/\brequire\s*\(/g) || []
}

/**
 * First-party `dist/esm` modules inside the tarball.
 *
 * `dist/esm/node_modules/**` is excluded: those are vendored third-party
 * chunks (ajv, vuedraggable) that we neither author nor can rewrite, and at
 * least one of them carries the literal string `require("ajv/…")` as DATA.
 *
 * @return {string[]} Tar entry paths.
 */
function firstPartyEsmEntries() {
	return entries.filter((name) =>
		name.startsWith('package/dist/esm/')
		&& name.endsWith('.js')
		&& !name.startsWith('package/dist/esm/node_modules/'),
	)
}

/**
 * No ESM module we ship may contain a CommonJS `require` call.
 *
 * WHY THIS IS A GENERAL INVARIANT AND NOT A ONE-OFF
 * -------------------------------------------------
 * `cnFormFieldRenderer` resolved `NcTextArea` through a CommonJS call inside a
 * try/catch. That can never work from `dist/esm/**`: the function does not
 * exist there, and `@nextcloud/vue@9`'s `exports` map has no CommonJS
 * condition to resolve against even where it does. The catch swallowed the
 * failure, `NcTextArea` was permanently null, every `widget: "textarea"` field
 * silently degraded — and each consuming app got a build warning nobody could
 * act on.
 *
 * The shape generalises: an ESM artifact that reaches for CommonJS is either a
 * build warning or a silent null in EVERY consumer, forever, and a try/catch
 * around it converts the whole thing into no symptom at all. Sweeping the
 * published ESM tree is the only check that sees all of them at once — this
 * one found four more sites beyond the reported bug (`@vueuse/core` in the
 * live-updates store plugin, `@nextcloud/initial-state` in the sentinel
 * resolver and in CnFeaturesAndRoadmapPage, `@nextcloud/capabilities` in the
 * integration-widget availability helper), each of them silently dead in the
 * same way.
 */
describe('packaging — no CommonJS require() survives in dist/esm', () => {
	it('CONTROL: the tarball actually ships first-party dist/esm modules', () => {
		// Without this, "none of them contain a require call" would be true of
		// an EMPTY list — an absence manufactured by a tarball with no dist in
		// it, which is exactly how a green run can mean nothing.
		const esm = firstPartyEsmEntries()
		expect(esm.length).toBeGreaterThan(50)
		expect(esm).toContain('package/dist/esm/composables/cnFormFieldRenderer.js')
	})

	it('CONTROL: the detector finds a require call in a synthetic module', () => {
		expect(requireCallsIn("const x = require('a')\n")).toHaveLength(1)
		expect(requireCallsIn('const y = require ("b")')).toHaveLength(1)
	})

	it('CONTROL: …and reports none for a module that has no such call', () => {
		// A detector that answered "yes" to everything would fail the sweep for
		// the wrong reason; one that answered "no" to everything would pass it
		// for the wrong reason. Both are covered.
		expect(requireCallsIn("import x from 'a'\nexport const required = true\n")).toEqual([])
	})

	it('CONTROL: the same sweep DOES find require calls in the shipped CJS bundle', () => {
		// The strongest control available: the identical method, reading a real
		// packed file, must find a PRESENCE. If this ever returns zero, the
		// clean result below is a broken lookup, not a clean artifact.
		const cjs = fs.readFileSync(path.join(packageRoot, 'dist', 'nextcloud-vue.cjs.js'), 'utf8')
		expect(requireCallsIn(cjs).length).toBeGreaterThan(10)
	})

	it('ships no CommonJS require call in any first-party dist/esm module', () => {
		const offenders = []
		for (const entry of firstPartyEsmEntries()) {
			const relative = entry.replace(/^package\//, '')
			const source = fs.readFileSync(path.join(packageRoot, relative), 'utf8')
			for (const line of source.split('\n')) {
				if (requireCallsIn(line).length > 0) {
					offenders.push(`${relative}: ${line.trim()}`)
				}
			}
		}
		// Listed rather than counted so the failure names the file and the line.
		expect(offenders).toEqual([])
	})
})

/**
 * Licences of the third-party code this package REDISTRIBUTES.
 *
 * WHY THIS EXISTS
 * ---------------
 * `vue3-apexcharts` relicensed at 1.9.0 from MIT to a dual licence: free only
 * below $2M USD annual revenue, paid above it, and a separate paid
 * OEM/Redistribution licence for "no-code dashboards, developer platforms,
 * embedded BI tools, white-labeled apps or SDKs". This package declared
 * `~1.10.0` and rollup BUNDLES the wrapper into
 * `dist/esm/node_modules/vue3-apexcharts/dist/vue3-apexcharts.js` — so an
 * EUPL-1.2 library was shipping revenue-capped, field-of-use-restricted code
 * to every consumer, in the OEM case, with no way for a downstream app to pass
 * those terms on. Two apps had independently written the same npm `overrides`
 * workaround before it was fixed here.
 *
 * The Vue-2 line used `vue-apexcharts`, which never relicensed, so this only
 * appeared on the Vue-3 bump — a dependency whose licence changed under a
 * caret/tilde range is invisible until something looks.
 *
 * The sweep is over the packages actually present in `dist/esm/node_modules/`,
 * i.e. what we redistribute, not the whole dev tree.
 */
describe('packaging — every redistributed dependency is under an OSI licence', () => {
	/**
	 * Licences acceptable for code bundled into an EUPL-1.2 library.
	 *
	 * `AGPL-3.0-or-later` is listed because `@nextcloud/dialogs` is bundled and
	 * carries it; the EUPL-1.2 compatibility clause names AGPL v3 as a licence
	 * this work may be relicensed under, so the combination is coherent. Every
	 * other entry is permissive or weak-copyleft.
	 */
	const ALLOWED_LICENCES = new Set([
		'0BSD',
		'AGPL-3.0-or-later',
		'Apache-2.0',
		'BSD-2-Clause',
		'BSD-3-Clause',
		'CC0-1.0',
		'EUPL-1.2',
		'ISC',
		'MIT',
		'MPL-2.0',
		'Unlicense',
		'Zlib',
	])

	/**
	 * Evaluate an SPDX licence expression against the allowlist.
	 *
	 * `OR` means "pick either", so ONE allowed part is enough. `AND` means
	 * "comply with both", so EVERY part must be allowed. Splitting on `OR`
	 * alone — as several shared licence checkers do — accepts `MIT AND
	 * <anything>` on the strength of the MIT half, and rejecting the whole
	 * expression instead forces manual per-package overrides that then hide
	 * real findings.
	 *
	 * @param {string} expression SPDX expression or bare id.
	 * @return {boolean} True when the expression is acceptable.
	 */
	function licenceAllowed(expression) {
		if (typeof expression !== 'string' || expression.trim() === '') {
			return false
		}
		const normalised = expression.replace(/[()]/g, ' ').trim()
		// OR binds loosest: any alternative may satisfy the whole expression.
		return normalised.split(/\s+OR\s+/i).some((alternative) =>
			// Within an alternative, every AND-ed part must be allowed.
			alternative.split(/\s+AND\s+/i).every((part) =>
				ALLOWED_LICENCES.has(part.trim().replace(/\+$/, '')),
			),
		)
	}

	/**
	 * Package names bundled into `dist/esm/node_modules/` in the tarball.
	 *
	 * @return {string[]} Package names, scoped names included.
	 */
	function bundledPackages() {
		const prefix = 'package/dist/esm/node_modules/'
		const names = new Set()
		for (const entry of entries) {
			if (!entry.startsWith(prefix)) {
				continue
			}
			const rest = entry.slice(prefix.length).split('/')
			names.add(rest[0].startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0])
		}
		return [...names].filter(Boolean).sort()
	}

	it('CONTROL: OR accepts on one half, AND requires both', () => {
		expect(licenceAllowed('MIT OR Apache-2.0')).toBe(true)
		expect(licenceAllowed('(MPL-2.0 OR Apache-2.0)')).toBe(true)
		expect(licenceAllowed('MIT AND Zlib')).toBe(true)
		expect(licenceAllowed('MIT AND Proprietary-Nonsense')).toBe(false)
		expect(licenceAllowed('Proprietary-Nonsense OR Also-Nonsense')).toBe(false)
	})

	it('CONTROL: rejects the exact spelling a relicensed package ships', () => {
		// `vue3-apexcharts@1.10.0` declared literally this.
		expect(licenceAllowed('see LICENSE in LICENSE')).toBe(false)
		expect(licenceAllowed('SEE LICENSE IN LICENSE')).toBe(false)
		expect(licenceAllowed('')).toBe(false)
		expect(licenceAllowed(undefined)).toBe(false)
	})

	it('CONTROL: the tarball really does redistribute third-party code', () => {
		// "Every bundled package is fine" is worthless if the list is empty —
		// and it would be empty from a typo in the prefix.
		const bundled = bundledPackages()
		expect(bundled.length).toBeGreaterThan(10)
		expect(bundled).toContain('vue3-apexcharts')
		expect(bundled).toContain('apexcharts')
	})

	it('bundles no package under a non-OSI licence', () => {
		const offenders = []
		for (const name of bundledPackages()) {
			const manifest = path.join(REPO, 'node_modules', name, 'package.json')
			if (!fs.existsSync(manifest)) {
				offenders.push(`${name}: not installed — licence unverifiable`)
				continue
			}
			const { version, license } = JSON.parse(fs.readFileSync(manifest, 'utf8'))
			if (!licenceAllowed(license)) {
				offenders.push(`${name}@${version}: ${String(license)}`)
			}
		}
		expect(offenders).toEqual([])
	})

	it('pins vue3-apexcharts below the 1.9.0 relicensing boundary', () => {
		// Named explicitly, because the sweep above only sees the version that
		// happens to be installed. This is the assertion a future `npm update`
		// has to get past.
		// eslint-disable-next-line n/no-extraneous-require
		const semver = require('semver')
		const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'))
		const range = pkg.dependencies['vue3-apexcharts']
		expect(range).toBeDefined()
		expect(semver.satisfies('1.8.0', range)).toBe(true)
		// CONTROL for the matcher: the boundary and everything past it are out.
		expect(semver.satisfies('1.9.0', range)).toBe(false)
		expect(semver.satisfies('1.10.0', range)).toBe(false)
	})

	it('resolves an MIT vue3-apexcharts in the tree that gets bundled', () => {
		const wrapper = JSON.parse(
			fs.readFileSync(path.join(REPO, 'node_modules', 'vue3-apexcharts', 'package.json'), 'utf8'),
		)
		expect(wrapper.license).toBe('MIT')
		expect(semverMajorMinor(wrapper.version)).toBe('1.8')
	})

	it('keeps apexcharts core on its MIT major', () => {
		// Core relicensed at 5.x. `^4.x` cannot reach it; assert both the range
		// and what actually resolved, since either alone can be wrong.
		const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'))
		// eslint-disable-next-line n/no-extraneous-require
		const semver = require('semver')
		expect(semver.satisfies('5.0.0', pkg.dependencies.apexcharts)).toBe(false)
		const core = JSON.parse(
			fs.readFileSync(path.join(REPO, 'node_modules', 'apexcharts', 'package.json'), 'utf8'),
		)
		expect(core.license).toBe('MIT')
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
