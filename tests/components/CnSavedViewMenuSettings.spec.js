/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * saved-view-menu-settings: the "Views in my menu" settings section (board
 * DqPersoonlijkeInstellingen). It lists the user's My views menu entries in
 * menu order, reorders and removes them ("Remove from menu"), and adds any
 * view the user can see on a page of the app: the pages' default views and
 * the saved views that belong on the page. Each row says what its view shows
 * and how many records that is ("Case type Woo request, status Open · 19
 * cases"); the count fills in on its own. Every change goes to CnAppRoot's
 * menu holder, which stores the list.
 *
 * @spec openspec/changes/saved-view-menu-settings/specs/saved-view-menu-settings/spec.md#requirement-a-user-orders-and-picks-the-views-in-their-menu
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnOrderedListField from '../../src/components/CnOrderedListField/CnOrderedListField.vue'
import CnSavedViewMenuSettings from '../../src/components/CnSavedViewMenuSettings/CnSavedViewMenuSettings.vue'

const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockGet(...args) },
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => url }))

const NcSelectStub = {
	name: 'NcSelect',
	props: ['options', 'inputLabel', 'placeholder', 'modelValue'],
	emits: ['update:modelValue', 'search'],
	template: '<div class="select-stub" />',
}

const MANIFEST = {
	pages: [
		{
			id: 'Cases',
			type: 'index',
			title: 'All cases',
			config: {
				register: 'dossiq',
				schema: 'case',
				allowSavedViews: true,
				countSubtitle: '{total} cases',
				defaultSavedViews: [{ slug: 'this-week', name: 'Deadline this week', filters: { due: 'week' } }],
			},
		},
		{ id: 'Contacts', type: 'index', title: 'Contacts', config: { register: 'dossiq', schema: 'contact', allowSavedViews: false } },
		{ id: 'Dashboard', type: 'dashboard', title: 'Dashboard', config: {} },
	],
}

const SCHEMA = {
	properties: {
		caseType: { type: 'string', title: 'Case type', $ref: 'caseType' },
		status: { type: 'string', title: 'Status', oneOf: [{ const: 'open', title: 'Open' }] },
		due: { type: 'string', title: 'Deadline' },
	},
}

const VIEWS = [
	{ id: 7, name: 'Woo requests', query: { scope: 'dossiq/case', filters: { caseType: ['woo-uuid'], status: 'open' } } },
	{ id: 8, name: 'Contacts in town', query: { scope: 'dossiq/contact', filters: {} } },
]

/**
 * @param {Array<object>} entries The stored menu entries.
 * @return {{wrapper: object, menu: object}} The mounted section and its menu holder.
 */
async function mountSection(entries) {
	mockGet.mockImplementation(async (url) => (String(url).includes('aggregations') ? { data: { value: 19 } } : { data: { results: VIEWS } }))
	global.fetch = jest.fn(async (url) => ({
		ok: true,
		json: async () => (String(url).includes('/schemas/') ? SCHEMA : { results: [{ id: 'woo-uuid', title: 'Woo request' }] }),
	}))
	const menu = { entries, set: jest.fn() }
	const wrapper = mount(CnSavedViewMenuSettings, {
		global: {
			provide: { cnSavedViewMenu: menu, cnManifest: MANIFEST, cnTranslate: (key) => key },
			stubs: { NcSelect: NcSelectStub },
		},
	})
	await flushPromises()
	return { wrapper, menu }
}

describe('CnSavedViewMenuSettings', () => {
	it('lists the menu entries in menu order, each with the page it filters', async () => {
		const { wrapper } = await mountSection([
			{ id: '7', page: 'Cases', name: 'Woo requests' },
			{ id: 'default:this-week', page: 'Cases', name: 'Deadline this week' },
		])
		const rows = wrapper.findAll('.cn-ordered-list-field__row')
		expect(rows.map((r) => r.find('.cn-ordered-list-field__name').text())).toEqual(['Woo requests', 'Deadline this week'])
	})

	it('says what each view shows and how many records that is, as the board does', async () => {
		const { wrapper } = await mountSection([
			{ id: '7', page: 'Cases', name: 'Woo requests' },
			{ id: 'default:this-week', page: 'Cases', name: 'Deadline this week' },
		])
		await flushPromises()
		const lines = wrapper.findAll('.cn-ordered-list-field__row .cn-ordered-list-field__description').map((d) => d.text())
		expect(lines).toEqual(['Case type Woo request, status Open · 19 cases', 'Deadline week · 19 cases'])
	})

	it('asks each count once and shows the row before the count is in', async () => {
		let release
		mockGet.mockReset()
		mockGet.mockImplementation((url) => (String(url).includes('aggregations')
			? new Promise((resolve) => {
					release = () => resolve({ data: { value: 4 } })
				})
			: Promise.resolve({ data: { results: VIEWS } })))
		const menu = { entries: [{ id: 'default:this-week', page: 'Cases', name: 'Deadline this week' }], set: jest.fn() }
		const wrapper = mount(CnSavedViewMenuSettings, {
			global: {
				provide: { cnSavedViewMenu: menu, cnManifest: { pages: [{ ...MANIFEST.pages[0], config: { ...MANIFEST.pages[0].config, filter: { isDraft: false } } }] }, cnTranslate: (key) => key },
				stubs: { NcSelect: NcSelectStub },
			},
		})
		await flushPromises()
		expect(wrapper.find('.cn-ordered-list-field__row .cn-ordered-list-field__description').text()).toBe('Deadline week')
		release()
		await flushPromises()
		expect(wrapper.find('.cn-ordered-list-field__row .cn-ordered-list-field__description').text()).toBe('Deadline week · 4 cases')
		const counts = mockGet.mock.calls.filter(([url]) => String(url).includes('aggregations'))
		expect(counts).toHaveLength(1)
		expect(counts[0][1].params).toMatchObject({ 'filter[isDraft]': false, 'filter[due]': 'week' })
	})

	it('offers the views of the pages that offer saved views, not those already in the menu', async () => {
		const { wrapper } = await mountSection([{ id: '7', page: 'Cases', name: 'Woo requests' }])
		const offered = wrapper.findComponent(NcSelectStub).props('options').map((o) => `${o.value}:${o.label}`)
		expect(offered).toEqual(['Cases|default:this-week:Deadline this week'])
	})

	it('stores the new order', async () => {
		const { wrapper, menu } = await mountSection([
			{ id: '7', page: 'Cases', name: 'Woo requests' },
			{ id: 'default:this-week', page: 'Cases', name: 'Deadline this week' },
		])
		await wrapper.find('[data-testid="cn-ordered-list-down-Cases|7"]').trigger('click')
		expect(menu.set).toHaveBeenCalledWith([
			{ id: 'default:this-week', page: 'Cases', name: 'Deadline this week' },
			{ id: '7', page: 'Cases', name: 'Woo requests' },
		])
	})

	it('takes a view out of the menu with "Remove from menu", naming the view', async () => {
		const { wrapper, menu } = await mountSection([{ id: '7', page: 'Cases', name: 'Woo requests' }])
		const remove = wrapper.find('[data-testid="cn-ordered-list-remove-Cases|7"]')
		expect(remove.text()).toBe('Remove from menu')
		expect(remove.attributes('aria-label')).toBe('Remove from menu: Woo requests')
		await remove.trigger('click')
		expect(menu.set).toHaveBeenCalledWith([])
	})

	it('adds a picked view at the bottom', async () => {
		const { wrapper, menu } = await mountSection([{ id: '7', page: 'Cases', name: 'Woo requests' }])
		const option = wrapper.findComponent(NcSelectStub).props('options')[0]
		wrapper.findComponent(NcSelectStub).vm.$emit('update:modelValue', option)
		expect(menu.set).toHaveBeenCalledWith([
			{ id: '7', page: 'Cases', name: 'Woo requests' },
			{ id: 'default:this-week', page: 'Cases', name: 'Deadline this week' },
		])
	})

	it('shows the hint under the picker', async () => {
		const { wrapper } = await mountSection([])
		expect(wrapper.findComponent(CnOrderedListField).props('addHint')).toMatch(/default views/)
		expect(wrapper.find('[data-testid="cn-ordered-list-hint"]').exists()).toBe(true)
	})

	it('leaves the page\'s hidden filters out of the line and names the rest as the Active line does', async () => {
		const manifest = {
			pages: [{
				id: 'Cases',
				type: 'index',
				title: 'All cases',
				config: {
					register: 'dossiq',
					schema: 'case',
					allowSavedViews: true,
					filterLabels: { statusHiddenInLists: { hidden: true }, isDraft: { hidden: true } },
				},
			}],
		}
		mockGet.mockImplementation(async () => ({ data: { results: [{ id: 9, name: 'Woo requests', query: { scope: 'dossiq/case', filters: { caseType: ['woo-uuid'], statusHiddenInLists: false, isDraft: false } } }] } }))
		global.fetch = jest.fn(async (url) => ({
			ok: true,
			json: async () => (String(url).includes('/schemas/') ? SCHEMA : { results: [{ id: 'woo-uuid', title: 'Woo request' }] }),
		}))
		const wrapper = mount(CnSavedViewMenuSettings, {
			global: {
				provide: { cnSavedViewMenu: { entries: [{ id: '9', page: 'Cases', name: 'Woo requests' }], set: jest.fn() }, cnManifest: manifest, cnTranslate: (key) => key },
				stubs: { NcSelect: NcSelectStub },
			},
		})
		await flushPromises()
		await flushPromises()
		const line = wrapper.find('.cn-ordered-list-field__row').text()
		expect(line).toContain('Case type Woo request')
		expect(line).not.toContain('statusHiddenInLists')
		expect(line).not.toContain('isDraft')
	})

	/**
	 * @spec openspec/changes/saved-view-summary-match-field-labels/specs/saved-view-menu-settings/spec.md#requirement-a-filter-on-a-records-identifier-reads-as-the-records-name
	 */
	it('names a record a filter identifies by another field, as the page\'s filterLabels says', async () => {
		const manifest = {
			pages: [{
				id: 'Cases',
				type: 'index',
				title: 'All cases',
				config: {
					register: 'dossiq',
					schema: 'case',
					allowSavedViews: true,
					filterLabels: { caseTypeIdentifier: { label: 'Case type', reference: { schema: 'caseType', matchField: 'identifier', labelField: 'title' } } },
				},
			}],
		}
		mockGet.mockImplementation(async () => ({ data: { results: [{ id: 12, name: 'Woo requests', query: { scope: 'dossiq/case', filters: { caseTypeIdentifier: 'woo-verzoek' } } }] } }))
		global.fetch = jest.fn(async (url) => ({
			ok: true,
			json: async () => (String(url).includes('/schemas/') ? SCHEMA : (String(url).includes('identifier=woo-verzoek') ? { results: [{ id: 'woo-uuid', identifier: 'woo-verzoek', title: 'Woo-verzoek' }] } : { results: [] })),
		}))
		const wrapper = mount(CnSavedViewMenuSettings, {
			global: {
				provide: { cnSavedViewMenu: { entries: [{ id: '12', page: 'Cases', name: 'Woo requests' }], set: jest.fn() }, cnManifest: manifest, cnTranslate: (key) => key },
				stubs: { NcSelect: NcSelectStub },
			},
		})
		await flushPromises()
		await flushPromises()
		expect(wrapper.find('.cn-ordered-list-field__row').text()).toContain('Case type Woo-verzoek')
		expect(global.fetch.mock.calls.some(([url]) => String(url).includes('/objects/dossiq/caseType') && String(url).includes('identifier=woo-verzoek'))).toBe(true)
	})

	it('asks for a page\'s schema again when it could not be read, so a failed read is not a session of raw keys', async () => {
		const manifest = {
			pages: [{ id: 'Retry', type: 'index', title: 'Retry', config: { register: 'retryreg', schema: 'case', allowSavedViews: true } }],
		}
		mockGet.mockImplementation(async () => ({ data: { results: [{ id: 11, name: 'Woo', query: { scope: 'retryreg/case', filters: { status: 'open' } } }] } }))
		const mountIt = () => mount(CnSavedViewMenuSettings, {
			global: {
				provide: { cnSavedViewMenu: { entries: [{ id: '11', page: 'Retry', name: 'Woo' }], set: jest.fn() }, cnManifest: manifest, cnTranslate: (key) => key },
				stubs: { NcSelect: NcSelectStub },
			},
		})
		global.fetch = jest.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }))
		mountIt()
		await flushPromises()
		global.fetch = jest.fn(async (url) => ({ ok: true, json: async () => (String(url).includes('/schemas/') ? SCHEMA : { results: [] }) }))
		const second = mountIt()
		await flushPromises()
		await flushPromises()
		expect(second.find('.cn-ordered-list-field__row').text()).toContain('Status Open')
	})
})
