/**
 * Dispatch and post-check tests for validateManifest().
 *
 * Covers tasks.md §5.2:
 *  - v2 manifest dispatches to v2 validator
 *  - v1 manifest (no $schema) dispatches to v1 validator
 *  - Unknown $schema falls back to v1 + triggers console.warn
 *  - gridX + gridWidth > 12 caught by post-schema check
 *
 * Also covers REQ-MV2S-009 scenarios.
 */

import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://codeberg.org/Conduction/nextcloud-vue/raw/branch/main/src/schemas/app-manifest-v2.schema.json'
const V1_SCHEMA_URL = 'https://codeberg.org/Conduction/nextcloud-vue/raw/branch/main/src/schemas/app-manifest.schema.json'

const MINIMAL_V2 = {
	$schema: V2_SCHEMA_URL,
	version: '2.0.0',
	menu: [],
	pages: [],
}

const MINIMAL_V1 = {
	version: '1.0.0',
	menu: [],
	pages: [],
}

describe('validateManifest() dispatch (REQ-MV2S-009)', () => {
	it('v2 manifest with $schema ending in /app-manifest-v2.schema.json dispatches to v2 validator', () => {
		const result = validateManifest(MINIMAL_V2)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('v1 manifest with no $schema dispatches to v1 validator and passes', () => {
		const result = validateManifest(MINIMAL_V1)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('v1 manifest with explicit v1 $schema dispatches to v1 validator', () => {
		const manifest = { ...MINIMAL_V1, $schema: V1_SCHEMA_URL }
		const result = validateManifest(manifest)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('unknown $schema falls back to v1 and emits console.warn', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const manifest = {
			$schema: 'https://example.com/unknown-schema.json',
			version: '1.0.0',
			menu: [],
			pages: [],
		}
		const result = validateManifest(manifest)
		// Falls back to v1 validator — manifest is otherwise valid v1
		expect(result.valid).toBe(true)
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('Unknown $schema URL'),
		)
		warnSpy.mockRestore()
	})

	it('v2 manifest with missing required fields returns errors', () => {
		// Missing version — should fail v2 validation
		const manifest = {
			$schema: V2_SCHEMA_URL,
			menu: [],
			pages: [],
		}
		const result = validateManifest(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.length).toBeGreaterThan(0)
	})

	it('v2 manifest with invalid semver version returns error', () => {
		const manifest = {
			...MINIMAL_V2,
			version: 'not-semver',
		}
		const result = validateManifest(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.toLowerCase().includes('version') || e.toLowerCase().includes('pattern'))).toBe(true)
	})
})

describe('validateManifest() post-schema grid check (REQ-MV2S-005 / REQ-MV2S-009)', () => {
	it('manifest where gridX + gridWidth > 12 returns valid: false with arithmetic error', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'dashboard',
				route: '/dashboard',
				type: 'dashboard',
				title: 'app.dashboard',
				widgets: [{
					widgetKey: 'WideWidget',
					slot: 'body',
					gridX: 8,
					gridY: 0,
					gridWidth: 6,
					gridHeight: 2,
				}],
			}],
		}
		const result = validateManifest(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('gridX') && e.includes('gridWidth') && e.includes('12'))).toBe(true)
	})

	it('manifest where gridX + gridWidth === 12 passes (boundary)', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'dashboard',
				route: '/dashboard',
				type: 'dashboard',
				title: 'app.dashboard',
				widgets: [{
					widgetKey: 'FullWidget',
					slot: 'body',
					gridX: 0,
					gridY: 0,
					gridWidth: 12,
					gridHeight: 2,
				}],
			}],
		}
		const result = validateManifest(manifest)
		expect(result.valid).toBe(true)
	})

	it('manifest where gridX: 9 + gridWidth: 5 = 14 > 12 returns error (spec scenario)', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'page',
				route: '/',
				type: 'index',
				title: 'app.index',
				widgets: [{
					widgetKey: 'OverflowWidget',
					slot: 'body',
					gridX: 9,
					gridY: 0,
					gridWidth: 5,
					gridHeight: 1,
				}],
			}],
		}
		const result = validateManifest(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('14') || (e.includes('gridX') && e.includes('gridWidth')))).toBe(true)
	})

	it('gridX: 6 + gridWidth: 6 = 12 is exactly at boundary — passes', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'page',
				route: '/',
				type: 'index',
				title: 'app.index',
				widgets: [{
					widgetKey: 'HalfWidget',
					slot: 'body',
					gridX: 6,
					gridY: 0,
					gridWidth: 6,
					gridHeight: 1,
				}],
			}],
		}
		const result = validateManifest(manifest)
		expect(result.valid).toBe(true)
	})
})

describe('validateManifest() — v2 post-schema uniqueness check', () => {
	it('duplicate pages[].id returns valid: false', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [
				{ id: 'dup', route: '/a', type: 'index', title: 'a' },
				{ id: 'dup', route: '/b', type: 'index', title: 'b' },
			],
		}
		const result = validateManifest(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('dup') && e.includes('unique'))).toBe(true)
	})

	it('unique pages[].id passes', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [
				{ id: 'page-a', route: '/a', type: 'index', title: 'a' },
				{ id: 'page-b', route: '/b', type: 'detail', title: 'b' },
			],
		}
		const result = validateManifest(manifest)
		expect(result.valid).toBe(true)
	})
})

describe('validateManifest() — v2 @resolve: sentinel rejection on registry-key paths', () => {
	it('sentinel in menu[].id is rejected', () => {
		const manifest = {
			...MINIMAL_V2,
			menu: [{ id: '@resolve:menu_id', label: 'x' }],
		}
		const result = validateManifest(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('sentinel'))).toBe(true)
	})

	it('sentinel in pages[].route is rejected', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'test',
				route: '@resolve:some_route',
				type: 'index',
				title: 'x',
			}],
		}
		const result = validateManifest(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('sentinel'))).toBe(true)
	})

	it('sentinel in pages[].config is allowed (runtime substitution)', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'test',
				route: '/test',
				type: 'index',
				title: 'x',
				config: { register: '@resolve:listing_register' },
			}],
		}
		const result = validateManifest(manifest)
		expect(result.valid).toBe(true)
	})
})

describe('validateManifest() — non-object input', () => {
	it('null manifest returns valid: false', () => {
		const result = validateManifest(null)
		expect(result.valid).toBe(false)
	})

	it('string manifest returns valid: false', () => {
		const result = validateManifest('not an object')
		expect(result.valid).toBe(false)
	})
})
