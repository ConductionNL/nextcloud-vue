/**
 * manifest.d.ts <-> v2 schema drift guard (2026-07-06 manifest fleet audit,
 * item 16).
 *
 * The hand-authored TypeScript types in src/types/manifest.d.ts are ergonomic
 * aids apps use when authoring src/manifest.json. They drifted badly before
 * this guard: the docblock still referenced the v1 schema, and TManifest was
 * missing five top-level v2 fields the fleet actively ships (observability,
 * deepLinks, setup, walkthrough, openbuildEditable).
 *
 * This is a pragmatic text-level guard, not a full generator: it asserts that
 * for every top-level property and every page `type` the CANONICAL v2 schema
 * declares, the .d.ts source mentions it. So a future schema addition that
 * forgets to update the types fails HERE, in CI, instead of silently shipping
 * incomplete autocomplete / spurious excess-property errors to app authors.
 *
 * When this fails: add the new field/type to src/types/manifest.d.ts (and, if
 * it is a whole new sub-shape, a light interface for it) — do not weaken this
 * test.
 */

import fs from 'fs'
import path from 'path'
import schema from '../../src/schemas/app-manifest-v2.schema.json'

const dtsSource = fs.readFileSync(
	path.resolve(__dirname, '../../src/types/manifest.d.ts'),
	'utf8',
)

// A property is "covered" if its name appears as an identifier in the source
// (word-boundary match, so `nav` does not match `navigation`).
function covered(name) {
	return new RegExp(`\\b${name}\\b`).test(dtsSource)
}

describe('manifest.d.ts tracks the canonical v2 schema (audit item 16)', () => {
	const topLevel = Object.keys(schema.properties)
		// $schema is a JSON-Schema meta key, present in the .d.ts as `$schema?`.
		.filter((k) => k !== '$schema')

	it.each(topLevel)('declares the top-level v2 property "%s"', (prop) => {
		expect(covered(prop)).toBe(true)
	})

	const pageTypes = schema.$defs.page.properties.type.enum

	it.each(pageTypes)('includes the "%s" page type in TPageType', (t) => {
		// Page-type literals appear quoted in the TPageType union.
		expect(dtsSource.includes(`'${t}'`)).toBe(true)
	})

	it('does not still claim to mirror the v1 schema', () => {
		expect(dtsSource).not.toContain('app-manifest.schema.json')
		expect(dtsSource).toContain('app-manifest-v2.schema.json')
	})
})
