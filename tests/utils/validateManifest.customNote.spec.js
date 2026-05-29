/**
 * Tests for the manifest-custom-note-softening change (#315).
 *
 * The v2 schema used to require `_note` on every type='custom' page.
 * After the fleet cleanup, many flipped customs look like
 *   { type: 'custom', component: 'CnExportWizard', _note: 'uses CnExportWizard from lib' }
 * where the note duplicates what the `component` field says.
 *
 * New rule: when `component` matches the lib `Cn[A-Z]\w+` pattern,
 * the component name is self-documenting and `_note` is optional.
 * When `component` is absent or non-Cn (host-app SFC), `_note`
 * remains required (existing regression guard).
 */

import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://codeberg.org/Conduction/nextcloud-vue/raw/branch/main/src/schemas/app-manifest-v2.schema.json'

/**
 * Build a minimal v2 manifest with one type='custom' page.
 *
 * @param {object} extraPage Additional page-level fields (component, _note, …).
 * @return {object} Complete v2 manifest.
 */
function manifestWithCustom(extraPage) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.7.0',
		menu: [{ id: 'Custom', label: 'Custom', route: 'Custom', order: 10 }],
		pages: [
			{
				id: 'Custom',
				route: '/custom',
				type: 'custom',
				title: 'Custom',
				...extraPage,
			},
		],
	}
}

describe('type:"custom" _note — manifest-custom-note-softening (#315)', () => {
	it('passes when component is a lib Cn-prefixed SFC and _note is omitted', () => {
		const result = validateManifest(manifestWithCustom({ component: 'CnExportWizard' }))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('passes when component is a lib Cn-prefixed SFC and _note is still present (back-compat)', () => {
		const result = validateManifest(manifestWithCustom({
			component: 'CnExportWizard',
			_note: 'uses CnExportWizard from lib',
		}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('rejects when component is a host-app SFC (non-Cn) and _note is missing', () => {
		const result = validateManifest(manifestWithCustom({ component: 'MyAppView' }))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => /_note/.test(e))).toBe(true)
	})

	it('passes when component is a host-app SFC (non-Cn) and _note is set', () => {
		const result = validateManifest(manifestWithCustom({
			component: 'MyAppView',
			_note: 'app-specific dashboard view; cannot decompose to dashboard type',
		}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('rejects when both component and _note are missing (regression guard)', () => {
		const result = validateManifest(manifestWithCustom({}))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => /_note/.test(e))).toBe(true)
	})

	it('passes when component is missing but _note is set (existing behaviour)', () => {
		const result = validateManifest(manifestWithCustom({
			_note: 'no decomposition possible — bespoke iframe wrapper',
		}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('rejects a non-Cn component name that almost matches the pattern', () => {
		const result = validateManifest(manifestWithCustom({ component: 'cnExportWizard' }))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => /_note/.test(e))).toBe(true)
	})
})
