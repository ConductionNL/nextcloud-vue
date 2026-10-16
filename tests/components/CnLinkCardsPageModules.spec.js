/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Module cards on a `type: "links"` page (board PqModules): per module its
 * state, pages and an Open or Turn on button, a count beside the heading and
 * a note under the cards.
 *
 * @spec openspec/changes/screens-links-module-cards/specs/link-cards-page/spec.md#requirement-a-links-page-can-show-modules
 */
jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn(() => ({})) }))

const { mount } = require('@vue/test-utils')
const CnLinkCardsPage = require('../../src/components/CnLinkCardsPage/CnLinkCardsPage.vue').default

const router = {
	resolve: (to) => ({ href: '/apps/pipelinq' + (to.path ?? '/' + String(to.name).toLowerCase()) }),
	push: jest.fn(() => Promise.resolve()),
}

const MARKETING_PAGES = ['Segments', 'Templates', 'Articles', 'Lists', 'Blasts', 'Campaigns']
	.map((label) => ({ label, route: label, highlight: ['Campaigns', 'Blasts', 'Lists'].includes(label) }))

const modules = [
	{ id: 'sales', label: 'Sales', icon: 'CashMultiple', description: 'Leads and deals.', enabled: true, pages: [{ label: 'Leads', route: 'Leads' }, { label: 'Pipeline', route: 'Pipeline' }] },
	{ id: 'marketing', label: 'Marketing', enabled: true, pages: MARKETING_PAGES },
	{ id: 'pos', label: 'Till', enabled: false, pages: [{ label: 'Receipt', route: 'Receipt' }], enable: { route: '/admin/modules', permission: 'admin' } },
	{ id: 'loyalty', label: 'Loyalty', enabledIf: { 'menu.loyalty': true }, pages: [{ label: 'Report', route: 'LoyaltyReport' }] },
	{ id: 'hidden', label: 'Hidden', enabled: true, permission: 'never' },
]

function mountPage(config = {}, { permissions = ['admin'], runtime = { menu: { loyalty: true } } } = {}) {
	return mount(CnLinkCardsPage, {
		propsData: { cards: [{ id: 'Tasks', label: 'Tasks', route: 'Tasks' }], modules, footnote: 'An admin turns a module on.', ...config },
		provide: { cnPermissions: permissions, cnManifest: { runtime } },
		mocks: { $router: router },
		stubs: { CnIcon: true, InformationOutline: true, ChevronRight: { template: '<i class="chevron" />' }, OpenInNew: { template: '<i class="external" />' } },
	})
}

const cards = (wrapper) => wrapper.findAll('[data-testid="cn-module-card"]')

describe('CnLinkCardsPage modules', () => {
	it('draws a card per visible module with its state and a count beside the heading', () => {
		const wrapper = mountPage()
		expect(cards(wrapper).map((card) => card.attributes('data-module-id'))).toEqual(['sales', 'marketing', 'pos', 'loyalty'])
		expect(wrapper.findAll('[data-testid="cn-module-card-state"]').map((badge) => badge.text())).toEqual(['In the menu', 'In the menu', 'Off', 'In the menu'])
		expect(wrapper.find('[data-testid="cn-link-cards-modules-count"]').text()).toBe('3 of 4 are in the menu')
		expect(wrapper.find('.cn-link-cards-page__modules-title').text()).toBe('Modules')
		expect(wrapper.find('[data-testid="cn-link-cards-modules-note"]').text()).toBe('An admin turns a module on.')
	})

	it('names every page of a small module and the highlights of a large one', () => {
		const lines = mountPage().findAll('[data-testid="cn-module-card-pages-line"]').map((line) => line.text())
		expect(lines[0]).toBe('2 pages: Leads, Pipeline')
		expect(lines[1]).toBe('6 pages, including Lists, Blasts and Campaigns')
		expect(cards(mountPage())[1].findAll('.cn-module-card__page')).toHaveLength(6)
	})

	it('opens a module in the menu at its first page and routes a plain click', async () => {
		router.push.mockClear()
		const open = cards(mountPage())[0].find('[data-testid="cn-module-card-open"]')
		expect(open.attributes('href')).toBe('/apps/pipelinq/leads')
		await open.trigger('click', { button: 0 })
		expect(router.push).toHaveBeenCalledWith({ name: 'Leads' })
	})

	it('offers Turn on for a module that is off, only to who may turn it on', () => {
		const enable = cards(mountPage())[2].find('[data-testid="cn-module-card-enable"]')
		expect(enable.text()).toBe('Turn on')
		expect(enable.attributes('href')).toBe('/apps/pipelinq/admin/modules')
		const asUser = cards(mountPage({}, { permissions: ['read'] }))
		expect(asUser.map((card) => card.attributes('data-module-id'))).not.toContain('hidden')
		expect(asUser[2].find('[data-testid="cn-module-card-enable"]').exists()).toBe(false)
		expect(asUser[2].find('[data-testid="cn-module-card-open"]').exists()).toBe(false)
	})

	it('reads enabledIf against runtime', () => {
		const states = mountPage({}, { runtime: { menu: { loyalty: false } } }).findAll('[data-testid="cn-module-card-state"]').map((badge) => badge.text())
		expect(states[3]).toBe('Off')
	})

	it('draws no modules section without modules', () => {
		const wrapper = mountPage({ modules: [] })
		expect(wrapper.find('[data-testid="cn-link-cards-modules"]').exists()).toBe(false)
		expect(wrapper.findAll('[data-testid="cn-link-card"]')).toHaveLength(1)
	})
})

describe('CnLinkCardsPage groupStyle list', () => {
	const listConfig = {
		modules: [],
		groupStyle: 'list',
		categories: { also: 'Also in Pipelinq', more: 'More' },
		cards: [
			{ id: 'Tasks', label: 'Tasks', description: 'Every task.', icon: 'CheckboxMarkedOutline', category: 'also', route: 'Tasks' },
			{ id: 'Docs', label: 'Documentation', category: 'more', href: 'https://pipelinq.conduction.nl' },
		],
	}

	it('draws each group as one card of rows with a chevron or an external icon', () => {
		const wrapper = mountPage(listConfig)
		const groups = wrapper.findAll('[data-testid="cn-link-cards-group"]')
		expect(groups.map((group) => group.classes())).toEqual([
			expect.arrayContaining(['cn-link-cards-page__group--list']),
			expect.arrayContaining(['cn-link-cards-page__group--list']),
		])
		const rows = wrapper.findAll('.cn-link-cards-page__row')
		expect(rows).toHaveLength(2)
		expect(rows[0].find('.cn-link-cards-page__row-label').text()).toBe('Tasks')
		expect(rows[0].find('.chevron').exists()).toBe(true)
		expect(rows[1].find('.external').exists()).toBe(true)
		expect(rows[1].attributes('target')).toBe('_blank')
		expect(wrapper.find('.cn-link-cards-page__grid').exists()).toBe(false)
	})

	it('keeps the card grid by default', () => {
		const wrapper = mountPage({ ...listConfig, groupStyle: undefined })
		expect(wrapper.find('.cn-link-cards-page__row').exists()).toBe(false)
		expect(wrapper.findAll('.cn-link-cards-page__grid')).toHaveLength(2)
	})
})
