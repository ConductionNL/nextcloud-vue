/**
 * Tests for the `openbuild-admin-settings-abstraction` manifest schema
 * addition: the top-level `adminSettings[]` array + `$defs/adminSettingsEntry`.
 *
 * Covers:
 *  - a built-in `type: "organisation-credentials"` section validates
 *  - a custom `component` section validates
 *  - an entry with neither `type` nor `component` is rejected
 *  - an entry with both `type` and `component` is rejected
 *  - an unknown `type` value is rejected
 *  - a manifest with no `adminSettings` key still validates unchanged
 *
 * Exercised against the v2 schema (the canonical compiled validator).
 */

import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

/**
 * Build a minimal v2 manifest, optionally carrying an `adminSettings` block.
 *
 * @param {Array<object>} [adminSettings] The `adminSettings` array under test.
 * @return {object} Complete v2 manifest.
 */
function buildV2Manifest(adminSettings) {
	const manifest = {
		$schema: V2_SCHEMA_URL,
		version: '2.18.0',
		menu: [{ id: 'home', label: 'app.home', route: 'home', order: 1 }],
		pages: [{ id: 'home', route: '/', type: 'index', title: 'app.home' }],
	}
	if (adminSettings !== undefined) {
		manifest.adminSettings = adminSettings
	}
	return manifest
}

describe('manifest adminSettings validation', () => {
	it('accepts a built-in organisation-credentials section', () => {
		const result = validateManifest(buildV2Manifest([
			{ id: 'org-credentials', type: 'organisation-credentials', label: 'myapp.admin.orgCredentials', order: 10 },
		]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('accepts a custom component section', () => {
		const result = validateManifest(buildV2Manifest([
			{ id: 'billing', component: 'AdminBillingSection', label: 'myapp.admin.billing' },
		]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('rejects an entry with neither type nor component', () => {
		const result = validateManifest(buildV2Manifest([
			{ id: 'nothing', label: 'myapp.admin.nothing' },
		]))
		expect(result.valid).toBe(false)
	})

	it('rejects an entry with both type and component', () => {
		const result = validateManifest(buildV2Manifest([
			{ id: 'both', type: 'organisation-credentials', component: 'AdminBillingSection', label: 'myapp.admin.both' },
		]))
		expect(result.valid).toBe(false)
	})

	it('rejects an unknown built-in type', () => {
		const result = validateManifest(buildV2Manifest([
			{ id: 'made-up', type: 'made-up', label: 'myapp.admin.madeUp' },
		]))
		expect(result.valid).toBe(false)
	})

	it('rejects an entry missing the required id', () => {
		const result = validateManifest(buildV2Manifest([
			{ type: 'organisation-credentials', label: 'myapp.admin.orgCredentials' },
		]))
		expect(result.valid).toBe(false)
	})

	it('rejects an entry missing the required label', () => {
		const result = validateManifest(buildV2Manifest([
			{ id: 'org-credentials', type: 'organisation-credentials' },
		]))
		expect(result.valid).toBe(false)
	})

	it('rejects an unknown property on an entry (additionalProperties:false)', () => {
		const result = validateManifest(buildV2Manifest([
			{ id: 'org-credentials', type: 'organisation-credentials', label: 'x', bogus: true },
		]))
		expect(result.valid).toBe(false)
	})

	it('accepts an entry with an optional permission narrowing the section', () => {
		const result = validateManifest(buildV2Manifest([
			{ id: 'org-credentials', type: 'organisation-credentials', label: 'x', permission: 'group:owners' },
		]))
		expect(result.valid).toBe(true)
	})

	it('accepts an absent adminSettings key unchanged', () => {
		const result = validateManifest(buildV2Manifest(undefined))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('accepts an empty adminSettings array', () => {
		const result = validateManifest(buildV2Manifest([]))
		expect(result.valid).toBe(true)
	})
})
