/**
 * Unit tests for handleCustomPages and updateSchemaField / carryForwardVerbatimFields.
 */

import { handleCustomPages, handleCustomPage } from '../../../src/cli/transforms/handleCustomPages.js'
import { updateSchemaField, V2_SCHEMA_URL } from '../../../src/cli/transforms/updateSchemaField.js'
import { carryForwardVerbatimFields } from '../../../src/cli/transforms/carryForwardVerbatimFields.js'

// --- handleCustomPages ---

describe('handleCustomPage', () => {
	it('returns page unchanged when type is not custom', () => {
		const page = { id: 'p', type: 'index', title: 'P', route: '/p' }
		const { page: result, reportEntry } = handleCustomPage(page, {})
		expect(result).toBe(page)
		expect(reportEntry).toBeNull()
	})

	it('marks trivial custom page (component in customComponents) as registry suggestion', () => {
		const page = {
			id: 'my-custom',
			type: 'custom',
			title: 'Custom',
			route: '/custom',
			component: 'MyCustomView',
		}
		const customComponents = {
			MyCustomView: { component: 'MyCustomView' },
		}

		const { page: result, reportEntry } = handleCustomPage(page, customComponents)
		expect(result._note).toBe('TODO: add to registry')
		expect(reportEntry.kind).toBe('registry-suggestion')
		expect(reportEntry.pageId).toBe('my-custom')
		expect(reportEntry.componentName).toBe('MyCustomView')
	})

	it('marks non-trivial custom page (component not in customComponents) as todo', () => {
		const page = {
			id: 'live-meeting',
			type: 'custom',
			title: 'Live Meeting',
			route: '/live',
			component: 'LiveMeetingView',
		}
		const customComponents = {}

		const { page: result, reportEntry } = handleCustomPage(page, customComponents)
		expect(result._note).toBe('TODO: manual migration required — custom page not auto-converted')
		expect(reportEntry.kind).toBe('todo')
		expect(reportEntry.pageId).toBe('live-meeting')
	})

	it('marks custom page with no component as todo', () => {
		const page = {
			id: 'mystery',
			type: 'custom',
			title: 'Mystery',
			route: '/mystery',
		}

		const { page: result, reportEntry } = handleCustomPage(page, {})
		expect(result._note).toContain('TODO')
		expect(reportEntry.kind).toBe('todo')
		expect(reportEntry.componentName).toBeNull()
	})

	it('leaves _note unchanged when already set', () => {
		const page = {
			id: 'p',
			type: 'custom',
			title: 'P',
			route: '/p',
			_note: 'Manually set reason',
		}

		const { page: result, reportEntry } = handleCustomPage(page, {})
		expect(result._note).toBe('Manually set reason')
		expect(reportEntry).toBeNull()
	})
})

describe('handleCustomPages (manifest-level)', () => {
	it('processes all custom pages and returns report entries', () => {
		const manifest = {
			version: '1.0.0',
			menu: [],
			customComponents: {
				TrivialView: { component: 'TrivialView' },
			},
			pages: [
				{ id: 'index', type: 'index', title: 'Index', route: '/index' },
				{ id: 'custom1', type: 'custom', title: 'Custom 1', route: '/c1', component: 'TrivialView' },
				{ id: 'custom2', type: 'custom', title: 'Custom 2', route: '/c2', component: 'ComplexView' },
			],
		}

		const { manifest: result, reportEntries } = handleCustomPages(manifest)
		expect(reportEntries).toHaveLength(2)
		expect(result.pages[0]._note).toBeUndefined()
		expect(result.pages[1]._note).toBe('TODO: add to registry')
		expect(result.pages[2]._note).toContain('TODO')
	})
})

// --- updateSchemaField ---

describe('updateSchemaField', () => {
	it('sets $schema to the v2 canonical URL', () => {
		const manifest = { version: '1.0.0', menu: [], pages: [] }
		const result = updateSchemaField(manifest)
		expect(result.$schema).toBe(V2_SCHEMA_URL)
	})

	it('replaces existing $schema', () => {
		const manifest = {
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest.schema.json',
			version: '1.0.0',
			menu: [],
			pages: [],
		}
		const result = updateSchemaField(manifest)
		expect(result.$schema).toBe(V2_SCHEMA_URL)
	})

	it('returns a new object (does not mutate input)', () => {
		const manifest = { version: '1.0.0', menu: [], pages: [] }
		const result = updateSchemaField(manifest)
		expect(result).not.toBe(manifest)
		expect(manifest.$schema).toBeUndefined()
	})
})

// --- carryForwardVerbatimFields ---

describe('carryForwardVerbatimFields', () => {
	it('returns manifest unchanged', () => {
		const manifest = { version: '1.0.0', menu: [], pages: [] }
		const { manifest: result } = carryForwardVerbatimFields(manifest)
		expect(result).toBe(manifest)
	})

	it('detects dataSource, dynamicSource, @resolve:, sidebarComponent fields', () => {
		const manifest = {
			version: '1.0.0',
			menu: [
				{ id: 'nav', label: 'Nav', dynamicSource: { url: '/api/nav' } },
			],
			pages: [
				{
					id: 'p1',
					type: 'index',
					title: 'P1',
					route: '/p1',
					sidebarComponent: 'MySidebar',
					config: {
						dataSource: { register: 'items', schema: 'item', aggregate: 'count' },
					},
				},
			],
		}

		const { carriedFields } = carryForwardVerbatimFields(manifest)
		const keys = carriedFields.map((f) => f.key)
		expect(keys).toContain('dynamicSource')
		expect(keys).toContain('sidebarComponent')
		expect(keys).toContain('dataSource')
	})

	it('detects @resolve: prefixed keys', () => {
		const manifest = {
			version: '1.0.0',
			menu: [],
			pages: [
				{
					id: 'p1',
					type: 'index',
					title: 'P1',
					route: '/p1',
					config: {
						'@resolve:register': 'some-register',
					},
				},
			],
		}

		const { carriedFields } = carryForwardVerbatimFields(manifest)
		const keys = carriedFields.map((f) => f.key)
		expect(keys).toContain('@resolve:register')
	})
})
