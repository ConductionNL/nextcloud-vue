/**
 * Tests for per-scope list layout on `config.folderSidebar.folders[]`
 * (index-columns-per-scope).
 *
 * Two declarations meet on this page and they decide different things. The
 * page's `config.columns` decides MEMBERSHIP: which columns this page has at
 * all. A scope decides PRESENTATION: which of them it shows, in what order,
 * sorted by what, searched over what. So a scope naming a column the page does
 * not declare is refused rather than rendered, which is what stops a scope
 * written months ago from bringing back a column the page has since removed.
 */

import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const SCHEMA = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

function manifestWith(config) {
	return {
		$schema: SCHEMA,
		version: '2.0.0',
		menu: [],
		pages: [{ id: 'cases', route: '/cases', type: 'index', title: 'Cases', config }],
	}
}

const PAGE_COLUMNS = [
	{ key: 'identifier', label: 'Number' },
	{ key: 'requester', label: 'Requester' },
	{ key: 'deadline', label: 'Deadline' },
	{ key: 'status', label: 'Status' },
]

describe('validateManifestV2 — folderSidebar scope layout', () => {
	it('accepts a scope carrying columns, defaultSort and searchFields', () => {
		const { valid, errors } = validateManifestV2(manifestWith({
			columns: PAGE_COLUMNS,
			folderSidebar: {
				source: 'custom',
				field: 'caseType',
				folders: [{
					id: 'permit',
					name: 'Permits',
					columns: ['identifier', 'deadline'],
					defaultSort: { key: 'deadline', order: 'asc' },
					searchFields: ['identifier', 'requester'],
				}],
			},
		}))
		expect(errors).toEqual([])
		expect(valid).toBe(true)
	})

	it('accepts a scope that declares none of the three keys', () => {
		const { valid, errors } = validateManifestV2(manifestWith({
			columns: PAGE_COLUMNS,
			folderSidebar: { source: 'custom', folders: [{ id: 'complaint', name: 'Complaints' }] },
		}))
		expect(errors).toEqual([])
		expect(valid).toBe(true)
	})

	it('refuses a scope column the page does not declare, naming the scope and the key', () => {
		const { valid, errors } = validateManifestV2(manifestWith({
			columns: PAGE_COLUMNS,
			folderSidebar: {
				source: 'custom',
				folders: [{ id: 'permit', name: 'Permits', columns: ['identifier', 'location'] }],
			},
		}))
		expect(valid).toBe(false)
		const hit = errors.find((e) => e.includes('location'))
		expect(hit).toBeDefined()
		expect(hit).toContain('"permit"')
		expect(hit).toContain('pages[0].config.columns does not declare')
	})

	it('names the folder index when the scope carries no id', () => {
		const { errors } = validateManifestV2(manifestWith({
			columns: PAGE_COLUMNS,
			folderSidebar: { source: 'custom', folders: [{ name: 'Permits' }, { name: 'Other', columns: ['location'] }] },
		}))
		const hit = errors.find((e) => e.includes('location'))
		expect(hit).toContain('"folders[1]"')
	})

	it('a column object on the scope is measured by its key, not its label', () => {
		const { errors } = validateManifestV2(manifestWith({
			columns: PAGE_COLUMNS,
			folderSidebar: {
				source: 'custom',
				folders: [{ id: 'permit', columns: [{ key: 'deadline', label: 'Due' }, { key: 'location', label: 'Deadline' }] }],
			},
		}))
		expect(errors).toHaveLength(1)
		expect(errors[0]).toContain('"location"')
	})

	it('stays silent when the page declares no columns of its own', () => {
		// The columns are derived from the schema at runtime, which this
		// validator cannot read, so there is no declared set to measure a
		// scope against. Refusing here would be a rule stated on evidence
		// nobody has.
		const { valid, errors } = validateManifestV2(manifestWith({
			register: 'cases',
			schema: 'case',
			folderSidebar: { source: 'custom', folders: [{ id: 'permit', columns: ['anything'] }] },
		}))
		expect(errors).toEqual([])
		expect(valid).toBe(true)
	})

	it('refuses a sort order outside asc / desc', () => {
		const { valid, errors } = validateManifestV2(manifestWith({
			columns: PAGE_COLUMNS,
			folderSidebar: { source: 'custom', folders: [{ id: 'permit', defaultSort: { key: 'deadline', order: 'sideways' } }] },
		}))
		expect(valid).toBe(false)
		expect(errors.join('\n')).toContain('defaultSort')
	})

	it('leaves the pane\'s own free-form keys alone', () => {
		const { valid, errors } = validateManifestV2(manifestWith({
			columns: PAGE_COLUMNS,
			folderSidebar: {
				source: 'register',
				register: 'cases',
				schema: 'caseType',
				idField: '@self.uuid',
				nameField: 'title',
				allowCreate: true,
				title: 'Case types',
			},
		}))
		expect(errors).toEqual([])
		expect(valid).toBe(true)
	})
})
