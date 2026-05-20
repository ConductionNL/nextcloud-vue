/**
 * Tests for the manifest-index-action-toggles change.
 *
 * Covers:
 *   - schema (v2): `config.actionToggles` declared as a typed object
 *     of booleans on type='index' pages.
 *   - validator: `validateIndexActionToggles` produces typed errors
 *     with JSON-pointer paths for malformed shapes; permits unknown
 *     keys for forward-compat; passes when the block is omitted.
 *
 * Tests use the public `validateManifest()` dispatcher which routes to
 * `validateManifestV2()` for the v2 $schema. The dispatcher invokes the
 * Ajv-compiled schema validator AND the hand-rolled
 * `validateTypeConfig` post-schema pass — both surface the same
 * action-toggle errors from different layers.
 */

import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

/**
 * Build a minimal-valid v2 manifest carrying a single type='index'
 * page whose config is whatever the caller passes. Used as the
 * shared fixture for every actionToggles test below.
 *
 * @param {object} config The page's config block.
 * @return {object} A complete v2 manifest.
 */
function manifestWithIndexConfig(config) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.1.0',
		menu: [{ id: 'Items', label: 'Items', route: 'Items', order: 10 }],
		pages: [
			{
				id: 'Items',
				route: '/items',
				type: 'index',
				title: 'Items',
				config,
			},
		],
	}
}

describe('config.actionToggles — manifest-index-action-toggles', () => {
	it('passes when actionToggles is absent', () => {
		const result = validateManifest(manifestWithIndexConfig({
			register: 'myapp',
			schema: 'item',
		}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('passes with an empty actionToggles object', () => {
		const result = validateManifest(manifestWithIndexConfig({
			register: 'myapp',
			schema: 'item',
			actionToggles: {},
		}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('passes when every known toggle is set to a boolean', () => {
		const result = validateManifest(manifestWithIndexConfig({
			register: 'myapp',
			schema: 'item',
			actionToggles: {
				showAdd: false,
				showFormDialog: false,
				showEditAction: false,
				showCopyAction: false,
				showDeleteAction: false,
				showMassImport: false,
				showMassExport: false,
				showMassCopy: false,
				showMassDelete: false,
				showViewToggle: false,
				selectable: false,
			},
		}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('passes with mixed true/false toggles', () => {
		const result = validateManifest(manifestWithIndexConfig({
			register: 'myapp',
			schema: 'item',
			actionToggles: {
				showAdd: true,
				showMassDelete: false,
				showMassCopy: false,
			},
		}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('rejects non-object actionToggles with a path', () => {
		const result = validateManifest(manifestWithIndexConfig({
			register: 'myapp',
			schema: 'item',
			actionToggles: 'all-off',
		}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('actionToggles'))).toBe(true)
	})

	it('rejects a non-boolean toggle value with a path naming the key', () => {
		const result = validateManifest(manifestWithIndexConfig({
			register: 'myapp',
			schema: 'item',
			actionToggles: { showAdd: 'yes' },
		}))
		expect(result.valid).toBe(false)
		// Either the Ajv schema OR the hand-rolled validator surfaces
		// the offending key — both layers run for v2.
		expect(result.errors.some((e) => e.includes('showAdd'))).toBe(true)
	})

	it('allows an unknown toggle key (forward-compat)', () => {
		const result = validateManifest(manifestWithIndexConfig({
			register: 'myapp',
			schema: 'item',
			actionToggles: { futureToggle: true },
		}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})
})
