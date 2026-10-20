/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * saved-view-menu-settings: the "Views in my menu" settings section (board
 * DqPersoonlijkeInstellingen). It lists the user's My views menu entries in
 * menu order, reorders and removes them ("Remove from menu"), and adds any
 * view the user can see on a page of the app: the pages' default views and
 * the saved views that belong on the page. Every change goes to CnAppRoot's
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
				defaultSavedViews: [{ slug: 'this-week', name: 'Deadline this week', filters: { due: 'week' } }],
			},
		},
		{ id: 'Contacts', type: 'index', title: 'Contacts', config: { register: 'dossiq', schema: 'contact', allowSavedViews: false } },
		{ id: 'Dashboard', type: 'dashboard', title: 'Dashboard', config: {} },
	],
}

const VIEWS = [
	{ id: 7, name: 'Woo requests', query: { scope: 'dossiq/case', filters: { caseType: 'woo' } } },
	{ id: 8, name: 'Contacts in town', query: { scope: 'dossiq/contact', filters: {} } },
]

/**
 * @param {Array<object>} entries The stored menu entries.
 * @return {{wrapper: object, menu: object}} The mounted section and its menu holder.
 */
async function mountSection(entries) {
	mockGet.mockResolvedValue({ data: { results: VIEWS } })
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
		expect(rows[0].find('.cn-ordered-list-field__description').text()).toBe('All cases')
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
})
