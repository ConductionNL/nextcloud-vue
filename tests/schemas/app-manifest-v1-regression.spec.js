/**
 * v1 regression suite — verifies that existing v1 manifests continue to
 * produce the same pass/fail results after the v2 dispatch is added to
 * validateManifest().
 *
 * Covers tasks.md §5.3 and REQ-MV2S-011.
 *
 * Rules:
 *  - Every fixture that was valid before MUST still be valid.
 *  - Every fixture that was invalid before MUST still be invalid.
 *  - The specific error messages that v1 produced MUST still be present.
 */

import { validateManifest } from '../../src/utils/validateManifest.js'
import valid from '../fixtures/manifest-valid.json'
import invalid from '../fixtures/manifest-invalid.json'
import allTypes from '../fixtures/manifest-all-types.json'
import invalidTypeConfig from '../fixtures/manifest-invalid-type-config.json'
import settingsRich from '../fixtures/manifest-settings-rich.json'
import settingsTabs from '../fixtures/manifest-settings-tabs.json'
import sidebarShow from '../fixtures/manifest-sidebar-show.json'

describe('v1 regression — valid fixtures still pass (REQ-MV2S-011)', () => {
	it('manifest-valid.json still passes', () => {
		const result = validateManifest(valid)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('manifest-all-types.json still passes', () => {
		const result = validateManifest(allTypes)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('manifest-settings-rich.json still passes', () => {
		const result = validateManifest(settingsRich)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('manifest-settings-tabs.json still passes', () => {
		const result = validateManifest(settingsTabs)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('manifest-sidebar-show.json still passes', () => {
		const result = validateManifest(sidebarShow)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('minimal v1 manifest (no $schema) still passes', () => {
		const result = validateManifest({ version: '1.0.0', menu: [], pages: [] })
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('v1 manifest with dependencies[] still passes', () => {
		const result = validateManifest({ version: '1.0.0', menu: [], pages: [], dependencies: ['openregister'] })
		expect(result.valid).toBe(true)
	})

	it('v1 manifest with options.allowedTypes restriction still works', () => {
		const manifest = { version: '1.0.0', menu: [], pages: [{ id: 'x', route: '/x', type: 'index', title: 'x' }] }
		const result = validateManifest(manifest, { allowedTypes: ['index', 'detail'] })
		expect(result.valid).toBe(true)
	})
})

describe('v1 regression — invalid fixtures still fail (REQ-MV2S-011)', () => {
	it('manifest-invalid.json still fails with semver error', () => {
		const result = validateManifest(invalid)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/version') && e.includes('semver'))).toBe(true)
	})

	it('manifest-invalid.json still fails with duplicate id error', () => {
		const result = validateManifest(invalid)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('unique'))).toBe(true)
	})

	it('manifest-invalid.json still fails with missing label on menu item', () => {
		const result = validateManifest(invalid)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/menu/0/label'))).toBe(true)
	})

	it('manifest-invalid.json still fails with missing component for custom page', () => {
		const result = validateManifest(invalid)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('component') && e.includes('custom'))).toBe(true)
	})

	it('manifest-invalid-type-config.json still fails', () => {
		const result = validateManifest(invalidTypeConfig)
		expect(result.valid).toBe(false)
		expect(result.errors.length).toBeGreaterThan(0)
	})

	it('non-semver version still returns semver error', () => {
		const result = validateManifest({ version: 'not-a-version', menu: [], pages: [] })
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('semver'))).toBe(true)
	})

	it('missing pages array still returns error', () => {
		const result = validateManifest({ version: '1.0.0', menu: [] })
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/pages'))).toBe(true)
	})

	it('missing menu array still returns error', () => {
		const result = validateManifest({ version: '1.0.0', pages: [] })
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/menu'))).toBe(true)
	})

	it('non-object manifest still returns error', () => {
		const result = validateManifest('not an object')
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('object'))).toBe(true)
	})

	it('null manifest still returns error', () => {
		const result = validateManifest(null)
		expect(result.valid).toBe(false)
	})

	it('@resolve: sentinel in version still rejected', () => {
		const result = validateManifest({ version: '@resolve:app_version', menu: [], pages: [] })
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('sentinel'))).toBe(true)
	})

	it('@resolve: sentinel in pages[].id still rejected', () => {
		const result = validateManifest({
			version: '1.0.0',
			menu: [],
			pages: [{ id: '@resolve:page_id', route: '/x', type: 'index', title: 'x' }],
		})
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('sentinel'))).toBe(true)
	})

	it('@resolve: sentinel in menu[].id still rejected', () => {
		const result = validateManifest({
			version: '1.0.0',
			menu: [{ id: '@resolve:menu_id', label: 'x' }],
			pages: [],
		})
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('sentinel'))).toBe(true)
	})

	it('@resolve: sentinel in dependencies still rejected', () => {
		const result = validateManifest({
			version: '1.0.0',
			menu: [],
			pages: [],
			dependencies: ['@resolve:dep_key'],
		})
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('sentinel'))).toBe(true)
	})
})

describe('v1 regression — allowedTypes option still works', () => {
	it('unknown type accepted when no allowedTypes option', () => {
		const result = validateManifest({
			version: '1.0.0',
			menu: [],
			pages: [{ id: 'x', route: '/x', type: 'wizard', title: 'x' }],
		})
		// Without allowedTypes, 'wizard' type is accepted (v1 behavior)
		expect(result.errors.some((e) => e.includes('/pages/0/type'))).toBe(false)
	})

	it('unknown type rejected when allowedTypes is set', () => {
		const result = validateManifest(
			{
				version: '1.0.0',
				menu: [],
				pages: [{ id: 'x', route: '/x', type: 'wizard', title: 'x' }],
			},
			{ allowedTypes: ['index', 'detail', 'dashboard'] },
		)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('"wizard"') && e.includes('must be one of'))).toBe(true)
	})
})
