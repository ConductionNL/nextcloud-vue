/**
 * Tests for the manifest-field-widgets change (#314).
 *
 * Covers the typed `config.fieldWidgets[]` slot on type='form' and
 * type='detail' pages. Each entry mounts a lib Cn* SFC inline as a
 * form field or detail data slot; distinct from top-level
 * pages[].widgets[] which uses widgetKey + grid coordinates against
 * the host customComponents registry.
 *
 * Acceptance:
 *   - well-formed fieldWidgets[] on a form page validates
 *   - missing `component` on an entry rejects
 *   - non-Cn component name rejects (host-app SFCs not allowed here)
 *   - unknown extra props on an entry reject (additionalProperties:false)
 *   - same shape validates on a detail page
 */

import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://codeberg.org/Conduction/nextcloud-vue/raw/branch/main/src/schemas/app-manifest-v2.schema.json'

/**
 * Build a minimal v2 manifest with one type='form' page.
 *
 * @param {Array} fieldWidgets fieldWidgets[] to attach to the page config.
 * @return {object} Complete v2 manifest.
 */
function manifestWithForm(fieldWidgets) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.7.0',
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
					fieldWidgets,
				},
			},
		],
	}
}

/**
 * Build a minimal v2 manifest with one type='detail' page.
 *
 * @param {Array} fieldWidgets fieldWidgets[] to attach to the page config.
 * @return {object} Complete v2 manifest.
 */
function manifestWithDetail(fieldWidgets) {
	return {
		$schema: V2_SCHEMA_URL,
		version: '2.7.0',
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
					fieldWidgets,
				},
			},
		],
	}
}

describe('config.fieldWidgets — manifest-field-widgets (#314)', () => {
	it('passes with a well-formed fieldWidgets entry on a form page', () => {
		const result = validateManifest(manifestWithForm([
			{ id: 'body', component: 'CnMarkdownEditor', props: { rows: 12 } },
		]))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('passes with multiple fieldWidgets entries on a form page', () => {
		const result = validateManifest(manifestWithForm([
			{ id: 'body', component: 'CnMarkdownEditor' },
			{ id: 'tags', component: 'CnSchemaSelect', props: { multiple: true } },
		]))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('passes with the same shape on a detail page', () => {
		const result = validateManifest(manifestWithDetail([
			{ id: 'body', component: 'CnMarkdownEditor' },
		]))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('rejects an entry missing `component`', () => {
		const result = validateManifest(manifestWithForm([
			{ id: 'body', props: { rows: 12 } },
		]))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => /component/.test(e))).toBe(true)
	})

	it('rejects an entry missing `id`', () => {
		const result = validateManifest(manifestWithForm([
			{ component: 'CnMarkdownEditor' },
		]))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => /id/.test(e))).toBe(true)
	})

	it('rejects an entry whose component is not Cn-prefixed', () => {
		const result = validateManifest(manifestWithForm([
			{ id: 'body', component: 'MyAppMarkdown' },
		]))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => /component|pattern/.test(e))).toBe(true)
	})

	it('rejects an entry whose id starts with a digit', () => {
		const result = validateManifest(manifestWithForm([
			{ id: '0body', component: 'CnMarkdownEditor' },
		]))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => /id|pattern/.test(e))).toBe(true)
	})

	it('rejects unknown top-level keys on an entry (additionalProperties: false)', () => {
		const result = validateManifest(manifestWithForm([
			{ id: 'body', component: 'CnMarkdownEditor', bogusKey: 'x' },
		]))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => /bogusKey|additional/.test(e))).toBe(true)
	})

	it('passes with an optional _note string', () => {
		const result = validateManifest(manifestWithForm([
			{ id: 'body', component: 'CnMarkdownEditor', _note: 'long-form body field' },
		]))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})
})
