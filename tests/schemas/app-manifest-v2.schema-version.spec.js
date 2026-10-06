/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The v2 manifest schema cannot change content without changing `version`.
 *
 * The version is the signal a consumer reads. ConductionNL/.github vendors
 * the schema into the gate tooling and compares versions to see whether its
 * copy is behind. 2.61.0 shipped the `links` page type under an unchanged
 * 2.42.0, so the comparison read "current" and every app that used the new
 * page type failed the gate on a manifest that was correct.
 *
 * How it is checked: `app-manifest-v2.schema.hashes.json` holds one content
 * hash per version. The current schema must hash to the value recorded for
 * its own version. Change the content and keep the version, and the hash no
 * longer matches. Bump the version and forget to record it, and there is no
 * entry. Both fail here. `npm run update:manifest-schema-hash` records a new
 * version and refuses to replace a recorded one.
 *
 * A comparison with the last release tag would say the same thing, but the
 * CI checkout is shallow and carries no tags, so it would pass by not running.
 */
const fs = require('fs')
const { SCHEMA_PATH, hashSchema, readLedger } = require('../../scripts/manifest-schema-hash.js')

/**
 * @param {string} version A `major.minor.patch` version.
 * @return {number[]} Its three numbers.
 */
function parts(version) {
	return version.split('.').map((n) => Number(n))
}

/**
 * @param {string} a A version.
 * @param {string} b A version.
 * @return {number} Negative when a is lower, positive when higher, 0 when equal.
 */
function compareVersions(a, b) {
	const [pa, pb] = [parts(a), parts(b)]
	for (let i = 0; i < 3; i++) {
		if (pa[i] !== pb[i]) {
			return pa[i] - pb[i]
		}
	}
	return 0
}

describe('app-manifest-v2.schema.json: content and version move together', () => {
	const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'))
	const ledger = readLedger()

	it('has a version in major.minor.patch form', () => {
		expect(schema.version).toMatch(/^\d+\.\d+\.\d+$/)
	})

	it('hashes to the value recorded for its version', () => {
		const recorded = ledger.versions[schema.version]
		const actual = hashSchema(schema)
		if (recorded !== actual) {
			const message = recorded === undefined
				? `Schema version ${schema.version} has no recorded hash. Run \`npm run update:manifest-schema-hash\` and commit the ledger.`
				: `The schema content changed while its version still reads ${schema.version}. `
					+ 'Bump "version" in src/schemas/app-manifest-v2.schema.json (minor for an additive change), '
					+ 'then run `npm run update:manifest-schema-hash`.'
			throw new Error(message)
		}
		expect(actual).toBe(recorded)
	})

	it('is the highest version in the ledger, so a version is never reused', () => {
		const versions = Object.keys(ledger.versions)
		expect(versions.length).toBeGreaterThan(0)
		for (const version of versions) {
			expect(compareVersions(schema.version, version)).toBeGreaterThanOrEqual(0)
		}
	})

	it('the hash ignores formatting and sees a content change', () => {
		const reformatted = JSON.parse(JSON.stringify(schema, null, 2))
		expect(hashSchema(reformatted)).toBe(hashSchema(schema))
		const moved = { ...schema, properties: { ...schema.properties, somethingNew: { type: 'string' } } }
		expect(hashSchema(moved)).not.toBe(hashSchema(schema))
	})
})
