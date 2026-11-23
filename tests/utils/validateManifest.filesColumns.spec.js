/**
 * Tests for declared columns on a files page (files-browser-columns).
 *
 * The host declares which columns a files browser has. A name that matches no
 * built-in is refused with the page and the name in the message: dropping it
 * silently would look like a column that failed to load.
 */

import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const SCHEMA = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

function manifestWith(config) {
	return {
		$schema: SCHEMA,
		version: '2.0.0',
		menu: [],
		pages: [{ id: 'documents', route: '/documents', type: 'files', title: 'Documents', config: { folder: '/Cases', ...config } }],
	}
}

describe('validateManifestV2 — files browser columns', () => {
	it('accepts a files page that declares no columns', () => {
		const { valid, errors } = validateManifestV2(manifestWith({}))
		expect(errors).toEqual([])
		expect(valid).toBe(true)
	})

	it('accepts the built-in names', () => {
		const { valid, errors } = validateManifestV2(manifestWith({ columns: ['name', 'size', 'modified', 'owner', 'type', 'tags'] }))
		expect(errors).toEqual([])
		expect(valid).toBe(true)
	})

	it('accepts a declared column from the node, a DAV property and host row data', () => {
		const { valid, errors } = validateManifestV2(manifestWith({
			columns: [
				'name',
				{ key: 'sender', label: 'Sender', source: 'row' },
				{ key: 'scan', label: 'Scan', source: 'attribute', attribute: '{http://owncloud.org/ns}av-status', formatter: 'scanVerdict' },
				{ key: 'owner', label: 'Uploaded by', source: 'node' },
			],
		}))
		expect(errors).toEqual([])
		expect(valid).toBe(true)
	})

	it('refuses a name that matches no built-in, naming the page and the name', () => {
		const { valid, errors } = validateManifestV2(manifestWith({ columns: ['name', 'colour'] }))
		expect(valid).toBe(false)
		const hit = errors.find((e) => e.includes('colour'))
		expect(hit).toContain('"documents"')
		expect(hit).toContain('names no built-in column')
	})

	it('refuses an unknown source', () => {
		const { errors } = validateManifestV2(manifestWith({ columns: [{ key: 'sender', source: 'elsewhere' }] }))
		expect(errors.find((e) => e.includes('sender'))).toContain('node, attribute or row')
	})

	it('refuses an attribute column that names no DAV property', () => {
		const { errors } = validateManifestV2(manifestWith({ columns: [{ key: 'scan', source: 'attribute' }] }))
		expect(errors.find((e) => e.includes('scan'))).toContain('reads a DAV property but names none')
	})

	it('refuses an entry that is neither a name nor an object with a key', () => {
		const { errors } = validateManifestV2(manifestWith({ columns: [42] }))
		expect(errors.find((e) => e.includes('documents'))).toContain('neither a built-in name nor an object with a key')
	})

	it('leaves an index page\'s own columns alone', () => {
		const { valid, errors } = validateManifestV2({
			$schema: SCHEMA,
			version: '2.0.0',
			menu: [],
			pages: [{ id: 'cases', route: '/cases', type: 'index', title: 'Cases', config: { columns: ['colour', 'anything'] } }],
		})
		expect(errors).toEqual([])
		expect(valid).toBe(true)
	})
})
