/**
 * Tests for the manifest-public-mode change.
 *
 * Covers the typed `config.mode` enum on `type:'form'` (existing
 * behaviour, lifted into a shared helper) and `type:'detail'` (new).
 */

import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://codeberg.org/Conduction/nextcloud-vue/raw/branch/main/src/schemas/app-manifest-v2.schema.json'

/**
 * Build a minimal v2 manifest with a single form page using the
 * caller-supplied config. The form page requires fields[] +
 * submitHandler|submitEndpoint to validate; both supplied here.
 *
 * @param {object} extraConfig Additional config keys (e.g. mode).
 * @return {object} Complete v2 manifest.
 */
function manifestWithForm(extraConfig) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.5.0',
		menu: [{ id: 'Form', label: 'Form', route: 'Form', order: 10 }],
		pages: [
			{
				id: 'Form',
				route: '/form',
				type: 'form',
				title: 'Form',
				config: {
					fields: [{ key: 'name', type: 'string' }],
					submitHandler: 'onSubmit',
					...extraConfig,
				},
			},
		],
	}
}

/**
 * Build a minimal v2 manifest with a single detail page using the
 * caller-supplied config.
 *
 * @param {object} extraConfig Additional config keys (e.g. mode).
 * @return {object} Complete v2 manifest.
 */
function manifestWithDetail(extraConfig) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.5.0',
		menu: [{ id: 'Item', label: 'Item', route: 'Item', order: 10 }],
		pages: [
			{
				id: 'Item',
				route: '/items/:id',
				type: 'detail',
				title: 'Item',
				config: {
					register: 'myapp',
					schema: 'item',
					...extraConfig,
				},
			},
		],
	}
}

describe('config.mode — manifest-public-mode', () => {
	it('form: omitted mode validates', () => {
		const result = validateManifest(manifestWithForm({}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('detail: omitted mode validates', () => {
		const result = validateManifest(manifestWithDetail({}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('form: mode="public" validates', () => {
		const result = validateManifest(manifestWithForm({ mode: 'public' }))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('detail: mode="public" validates', () => {
		const result = validateManifest(manifestWithDetail({ mode: 'public' }))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('form: mode="edit" and mode="create" validate', () => {
		expect(validateManifest(manifestWithForm({ mode: 'edit' })).valid).toBe(true)
		expect(validateManifest(manifestWithForm({ mode: 'create' })).valid).toBe(true)
	})

	it('detail: mode="edit" and mode="create" validate', () => {
		expect(validateManifest(manifestWithDetail({ mode: 'edit' })).valid).toBe(true)
		expect(validateManifest(manifestWithDetail({ mode: 'create' })).valid).toBe(true)
	})

	it('form: mode="guest" rejects with the enum message', () => {
		const result = validateManifest(manifestWithForm({ mode: 'guest' }))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('mode'))).toBe(true)
	})

	it('detail: mode="guest" rejects with the enum message', () => {
		const result = validateManifest(manifestWithDetail({ mode: 'guest' }))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('mode'))).toBe(true)
	})

	it('form: non-string mode rejects', () => {
		const result = validateManifest(manifestWithForm({ mode: 42 }))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('mode'))).toBe(true)
	})

	it('detail: non-string mode rejects', () => {
		const result = validateManifest(manifestWithDetail({ mode: true }))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('mode'))).toBe(true)
	})
})
