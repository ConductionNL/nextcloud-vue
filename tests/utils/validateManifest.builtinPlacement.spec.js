/**
 * Tests for the row-action-builtin-placement change: the "builtin:<id>" placeholder grammar in `config.actions`, and the non-fatal placement warnings `validateManifestV2()` returns.
 */

import addFormats from 'ajv-formats'
import Ajv2020 from 'ajv/dist/2020'
import schema from '../../src/schemas/app-manifest-v2.schema.json'
import { validateManifest } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

/**
 * A minimal v2 manifest with one page of the given type and config.
 *
 * @param {object} config The page's config.
 * @param {string} [type] The page type.
 * @return {object} The manifest.
 */
function manifestWith(config, type = 'index') {
	return {
		$schema: V2_SCHEMA_URL,
		version: '1.0.0',
		menu: [{ id: 'items', label: 'Items', route: 'items', order: 10 }],
		pages: [{ id: 'items', route: '/items', type, title: 'Items', config: { register: 'app', schema: 'item', ...config } }],
	}
}

const FILE_LIST = { id: 'file-list', label: 'File list', handler: 'openPublicationFiles' }

describe('config.actions placeholders — schema', () => {
	it('accepts the OpenCatalogi Publications row actions', () => {
		const result = validateManifest(manifestWith({
			actionToggles: { showViewAction: false },
			actions: ['builtin:edit', 'builtin:copy', FILE_LIST, 'builtin:delete'],
		}))
		expect(result).toEqual({ valid: true, errors: [], warnings: [] })
	})

	it('warns about the same array while View is still on, since View is appended after Delete', () => {
		const result = validateManifest(manifestWith({ actions: ['builtin:edit', 'builtin:copy', FILE_LIST, 'builtin:delete'] }))
		expect(result.valid).toBe(true)
		expect(result.warnings).toHaveLength(1)
	})

	it('refuses an unknown placeholder', () => {
		const result = validateManifest(manifestWith({ actions: ['builtin:archive'] }))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('config/actions[0]'))).toBe(true)
	})

	it('refuses a bare reserved string', () => {
		const result = validateManifest(manifestWith({ actions: ['edit'] }))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('config/actions[0]'))).toBe(true)
	})

	it('refuses a placeholder repeated in one array', () => {
		const result = validateManifest(manifestWith({ actions: ['builtin:edit', 'builtin:edit'] }))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('config/actions'))).toBe(true)
	})

	it('still accepts two identical objects', () => {
		const result = validateManifest(manifestWith({ actions: [FILE_LIST, FILE_LIST] }))
		expect(result.valid).toBe(true)
	})

	it('refuses an app action whose id claims the built-in namespace', () => {
		const result = validateManifest(manifestWith({ actions: [{ id: 'builtin:edit', label: 'Edit' }] }))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('config/actions[0]'))).toBe(true)
	})

	it('refuses an app action that sets the builtin marker', () => {
		const result = validateManifest(manifestWith({ actions: [{ id: 'edit', label: 'Edit', builtin: true }] }))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('config/actions[0]'))).toBe(true)
	})

	it('refuses an app action whose id is not a string', () => {
		const result = validateManifest(manifestWith({ actions: [{ id: 7, label: 'Seven' }] }))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('config/actions[0]'))).toBe(true)
	})

	it('still accepts an app action with a reserved id', () => {
		const result = validateManifest(manifestWith({ actions: [{ id: 'edit', label: 'Open editor', handler: 'openEditor' }] }))
		expect(result.valid).toBe(true)
	})

	it('refuses a placeholder on a detail page', () => {
		const result = validateManifest(manifestWith({ actions: ['builtin:edit'] }, 'detail'))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('config/actions[0]'))).toBe(true)
	})

	it('reports the same errors through Ajv2020 against the raw schema, as apps\' check:manifest does', () => {
		const ajv = new Ajv2020({ allErrors: true, strict: false })
		addFormats(ajv)
		const validate = ajv.compile(schema)

		expect(validate(manifestWith({ actions: ['builtin:edit', 'builtin:copy', FILE_LIST, 'builtin:delete'] }))).toBe(true)
		for (const actions of [['builtin:archive'], ['edit'], ['builtin:edit', 'builtin:edit'], [{ id: 'builtin:edit', label: 'Edit' }], [{ id: 'edit', label: 'Edit', builtin: true }]]) {
			expect(validate(manifestWith({ actions }))).toBe(false)
		}
		expect(validate(manifestWith({ actions: ['builtin:edit'] }, 'detail'))).toBe(false)
	})
})

describe('config.actions placeholders — the Delete warning', () => {
	/**
	 * @param {object} config The index page's config.
	 * @return {object} The validation result.
	 */
	const check = (config) => validateManifest(manifestWith(config))

	/**
	 * @param {string} warning A warning.
	 * @return {boolean} Whether it is the Delete-not-last warning.
	 */
	const notLast = (warning) => warning.includes('is not the last row action')

	it('warns, without an error, when Delete is placed first', () => {
		const result = check({ actions: ['builtin:delete', 'builtin:edit'] })
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
		expect(result.warnings).toHaveLength(1)
		expect(result.warnings[0]).toContain('builtin:delete')
		expect(result.warnings[0]).toContain('pages[0]/config/actions')
	})

	it('warns when Delete is last in the array but enabled built-ins are appended after it', () => {
		const result = check({ actions: [{ id: 'archive', label: 'Archive' }, 'builtin:delete'] })
		expect(result.valid).toBe(true)
		expect(result.warnings).toHaveLength(1)
	})

	it('does not warn when every other built-in is off', () => {
		const result = check({
			actions: [{ id: 'archive', label: 'Archive' }, 'builtin:delete'],
			showEditAction: false,
			actionToggles: { showViewAction: false, showCopyAction: false },
		})
		expect(result.warnings).toEqual([])
	})

	it('lets an explicit config toggle win over actionToggles', () => {
		const result = check({
			actions: ['builtin:delete', { id: 'archive', label: 'Archive' }],
			showDeleteAction: false,
			actionToggles: { showDeleteAction: true },
		})
		expect(result.warnings.filter(notLast)).toEqual([])
	})

	it('treats readOnly as Delete off unless a toggle turns it back on', () => {
		expect(check({ actions: ['builtin:delete', { id: 'a', label: 'A' }], readOnly: true }).warnings.filter(notLast)).toEqual([])
		expect(check({ actions: ['builtin:delete', { id: 'a', label: 'A' }], readOnly: true, actionToggles: { showDeleteAction: true } }).warnings).toHaveLength(1)
	})

	it('does not warn when Delete is appended by default', () => {
		const result = check({ actions: ['builtin:edit', { id: 'archive', label: 'Archive' }] })
		expect(result.valid).toBe(true)
		expect(result.warnings).toEqual([])
	})

	it('warns about a placeholder whose built-in the manifest turns off', () => {
		const result = check({ actions: ['builtin:edit', 'builtin:copy'], actionToggles: { showCopyAction: false } })
		expect(result.valid).toBe(true)
		expect(result.warnings).toHaveLength(1)
		expect(result.warnings[0]).toContain('builtin:copy')
		expect(result.warnings[0]).toContain('pages[0]/config/actions')
	})

	it('warns about every placeholder a readOnly page turns off', () => {
		const result = check({ actions: ['builtin:edit', { id: 'a', label: 'A' }], readOnly: true })
		expect(result.warnings).toHaveLength(1)
		expect(result.warnings[0]).toContain('builtin:edit')
	})

	it('skips an entitySource page, whose built-ins depend on the source', () => {
		const result = check({ entitySource: 'flows', actions: ['builtin:delete', { id: 'open', label: 'Open' }] })
		expect(result.valid).toBe(true)
		expect(result.warnings).toEqual([])
	})
})
