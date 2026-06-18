/**
 * Tests for the manifest `deepLinks` block (ADR-040).
 *
 * The block is consumed by the integration registry / cross-app linking
 * (mapping an OR register+schema to an in-app URL template), NOT by the
 * Vue renderer. These tests confirm the v2 schema accepts a well-formed
 * deepLinks block (array of {registerSlug, schemaSlug, urlTemplate}, extra
 * keys tolerated) and rejects a deepLink missing the required registerSlug.
 */

import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

/**
 * Build a minimal valid v2 manifest carrying the supplied deepLinks block.
 *
 * @param {Array} deepLinks The deepLinks array under test.
 * @return {object} Complete v2 manifest.
 */
function manifestWithDeepLinks(deepLinks) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.10.0',
		menu: [],
		pages: [],
		deepLinks,
	}
}

describe('deepLinks block — ADR-040 (positive)', () => {
	it('manifest with no deepLinks block validates (additive/optional)', () => {
		const result = validateManifestV2({
			$schema: V2_SCHEMA_URL,
			version: '2.10.0',
			menu: [],
			pages: [],
		})
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('empty deepLinks array validates', () => {
		const result = validateManifestV2(manifestWithDeepLinks([]))
		expect(result.valid).toBe(true)
	})

	it('a valid deepLink with the three required keys validates', () => {
		const result = validateManifestV2(manifestWithDeepLinks([
			{
				registerSlug: 'myapp',
				schemaSlug: 'item',
				urlTemplate: '/index.php/apps/myapp/#/items/{uuid}',
			},
		]))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('a deepLink with the optional displayName + extra forward-compat keys validates', () => {
		const result = validateManifestV2(manifestWithDeepLinks([
			{
				registerSlug: 'myapp',
				schemaSlug: 'item',
				urlTemplate: '/index.php/apps/myapp/#/items/{uuid}',
				displayName: 'Item',
				icon: 'icon-files',
				futureKey: { nested: true },
			},
		]))
		expect(result.valid).toBe(true)
	})
})

describe('deepLinks block — ADR-040 (negative)', () => {
	it('rejects a deepLink missing the required registerSlug', () => {
		const result = validateManifestV2(manifestWithDeepLinks([
			{
				schemaSlug: 'item',
				urlTemplate: '/index.php/apps/myapp/#/items/{uuid}',
			},
		]))
		expect(result.valid).toBe(false)
	})

	it('rejects a deepLink missing the required schemaSlug', () => {
		const result = validateManifestV2(manifestWithDeepLinks([
			{
				registerSlug: 'myapp',
				urlTemplate: '/index.php/apps/myapp/#/items/{uuid}',
			},
		]))
		expect(result.valid).toBe(false)
	})

	it('rejects a deepLink missing the required urlTemplate', () => {
		const result = validateManifestV2(manifestWithDeepLinks([
			{
				registerSlug: 'myapp',
				schemaSlug: 'item',
			},
		]))
		expect(result.valid).toBe(false)
	})

	it('rejects a deepLinks value that is not an array', () => {
		const result = validateManifestV2(manifestWithDeepLinks({
			registerSlug: 'myapp',
			schemaSlug: 'item',
			urlTemplate: '/x/{uuid}',
		}))
		expect(result.valid).toBe(false)
	})
})
