#!/usr/bin/env node

/**
 * Peer-dependency consistency gate.
 *
 * A `peerDependencies` block can be internally CONTRADICTORY: package A is
 * declared at a range whose versions all require package B at a range that
 * shares no version with the range we declare for B. npm 7+ resolves peers
 * strictly, so every correctly-behaving consumer then hits ERESOLVE and has to
 * add an `overrides` entry — or, worse, installs with `--legacy-peer-deps` and
 * silently gets an unsupported tree.
 *
 * That is not hypothetical. Shipped in every release up to 2.1.0-vue3.15:
 *
 *     "@nextcloud/capabilities":  "^1.2.1"     ← requires initial-state ^3.0.0
 *     "@nextcloud/vue":           "^9.0.0"     ← requires initial-state ^3.0.0
 *     "@nextcloud/initial-state": "^2.2.0"     ← no overlap with either
 *
 * openregister had to add an override just to install. Nothing in CI noticed,
 * because the library's own `npm ci` installs its DEV tree — where the peers
 * are resolved from devDependencies and the contradiction never surfaces.
 *
 * OFFLINE BY DESIGN
 * -----------------
 * This gate reads the already-installed `node_modules` rather than querying
 * the registry: a network call in CI is a flake waiting to happen, and the
 * installed tree is what the repo actually builds and tests against. The
 * trade-off is coverage — it checks the resolved version of each peer, not
 * every version the declared range admits. A `--registry` pass would be
 * strictly stronger and is a reasonable follow-up; this catches the class of
 * bug that has actually shipped.
 *
 * Exit codes:
 *   0 — no contradiction found among the installed peers
 *   1 — at least one installed peer requires another peer at a range that
 *       cannot be satisfied together with our own declaration
 */

'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

/**
 * Read a package.json, returning null when it is absent or unparseable.
 *
 * @param {string} file Absolute path.
 *
 * @return {object|null} Parsed manifest.
 */
function readJson(file) {
	try {
		return JSON.parse(fs.readFileSync(file, 'utf8'))
	} catch {
		return null
	}
}

/**
 * Whether two semver ranges can be satisfied by a common version.
 *
 * @param {object} semver The `semver` module.
 * @param {string} a First range.
 * @param {string} b Second range.
 *
 * @return {boolean} True when the ranges intersect.
 */
function rangesIntersect(semver, a, b) {
	try {
		return semver.intersects(a, b, { includePrerelease: true })
	} catch {
		// A range this resolver cannot parse (a git URL, `*`, a workspace
		// protocol) is not evidence of a conflict. Say nothing rather than
		// manufacture a failure.
		return true
	}
}

/**
 * Run the gate.
 *
 * @return {void}
 */
function main() {
	const pkg = readJson(path.join(ROOT, 'package.json'))
	const peers = (pkg && pkg.peerDependencies) || {}
	const names = Object.keys(peers)

	if (names.length === 0) {
		console.log('✓ peer consistency: no peerDependencies declared')
		process.exit(0)
	}

	let semver
	try {
		// eslint-disable-next-line global-require
		semver = require('semver')
	} catch {
		console.error('  (peer-consistency gate skipped: `semver` is not installed)')
		process.exit(0)
	}

	const failures = []
	let inspected = 0

	for (const name of names) {
		const manifest = readJson(path.join(ROOT, 'node_modules', name, 'package.json'))
		if (manifest === null) {
			// Not installed — an optional peer the dev tree does not pull in.
			// Absence is not a finding.
			continue
		}
		inspected++

		// A peer's own requirements on ANOTHER of our peers, whether it lists
		// them as dependencies or as peerDependencies. Both constrain the
		// consumer's tree.
		const constraints = { ...(manifest.peerDependencies || {}), ...(manifest.dependencies || {}) }

		for (const [other, range] of Object.entries(constraints)) {
			if (!Object.prototype.hasOwnProperty.call(peers, other)) {
				continue
			}
			if (!rangesIntersect(semver, range, peers[other])) {
				failures.push(
					`${name}@${manifest.version} requires ${other}@${range}, `
					+ `but we declare ${other}@${peers[other]} — no version satisfies both.\n`
					+ `      Widen our ${other} peer (e.g. "${peers[other]} || ${range}") `
					+ 'or lower the peer that demands it.',
				)
			}
		}
	}

	if (inspected === 0) {
		// Positive control: a run that inspected nothing must not report a
		// clean bill of health. That shape — a check that cannot match
		// anything, printing a tick — is indistinguishable from a real pass.
		console.error('✗ peer consistency: no declared peer is installed — run `npm ci` first')
		process.exit(1)
	}

	if (failures.length > 0) {
		console.error('✗ peer consistency gate failed:')
		for (const failure of failures) {
			console.error(`  - ${failure}`)
		}
		console.error(
			'\nA contradictory peer block makes `npm install` fail with ERESOLVE for every\n'
			+ 'consumer that does not add an override. See scripts/check-peer-consistency.js.',
		)
		process.exit(1)
	}

	console.log(`✓ peer consistency: ${inspected} installed peer(s) agree with our declared ranges`)
	process.exit(0)
}

main()
