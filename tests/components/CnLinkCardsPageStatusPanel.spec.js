/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A link card's status pill and the links page's closing panel (board
 * PqGeavanceerdHub): a status filled from counts and the runtime, a tone per
 * status, and a panel with a badge, a link and facts gated by visibleIf.
 *
 * @spec openspec/changes/link-cards-status-and-panel/specs/link-cards-page/spec.md#requirement-a-link-card-can-carry-a-status
 * @spec openspec/changes/link-cards-status-and-panel/specs/link-cards-page/spec.md#requirement-a-links-page-can-close-with-a-panel
 */
jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn(() => ({})) }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => '/index.php' + url }))
const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...args) => mockGet(...args) } }))

const { mount, flushPromises } = require('@vue/test-utils')
const CnLinkCardsPage = require('../../src/components/CnLinkCardsPage/CnLinkCardsPage.vue').default

const router = {
	resolve: (to) => ({ href: '/apps/pipelinq' + (to.path ?? '/' + String(to.name).toLowerCase()) }),
	push: jest.fn(() => Promise.resolve()),
}

function mountPage(config, runtime = {}) {
	return mount(CnLinkCardsPage, {
		props: config,
		global: {
			provide: { cnPermissions: ['admin'], cnManifest: { runtime } },
			mocks: { $router: router },
			stubs: { CnIcon: true, InformationOutline: true, ChevronRight: true, OpenInNew: true },
		},
	})
}

const cards = [
	{ id: 'Reports', label: 'Reports', route: 'Reports', status: '7 reports' },
	{ id: 'Flows', label: 'Flows', route: 'Flows', status: '{active} active, {paused} paused', statusValues: { active: { url: '/apps/openregister/api/flows', path: 'active' }, paused: { url: '/apps/openregister/api/flows', path: 'paused' } } },
	{ id: 'Integrations', label: 'Integrations', route: 'Integrations', status: { text: '{count} connection has an error', tone: 'error' }, statusValues: { count: { url: '/apps/x/api/broken' } } },
	{ id: 'Modules', label: 'Modules', route: 'Modules', status: '{runtime.menu.on} of 6 modules on' },
	{ id: 'Store', label: 'Store', route: 'Store' },
]

describe('CnLinkCardsPage status and panel', () => {
	beforeEach(() => {
		mockGet.mockReset()
		mockGet.mockImplementation((url) => Promise.resolve({ data: url.includes('broken') ? { total: 1 } : { active: 7, paused: 2 } }))
	})

	it('draws a status pill per card, filled from its values and the runtime, with its tone', async () => {
		const wrapper = mountPage({ cards }, { menu: { on: 2 } })
		await flushPromises()
		const pills = wrapper.findAll('[data-testid="cn-link-card-status"]')
		expect(pills.map((pill) => pill.text())).toEqual(['7 reports', '7 active, 2 paused', '1 connection has an error', '2 of 6 modules on'])
		expect(pills[2].classes()).toContain('cn-link-cards-page__status--error')
		expect(pills[0].classes()).toContain('cn-link-cards-page__status--neutral')
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/openregister/api/flows', { params: {} })
	})

	it('counts the list items a where names', async () => {
		mockGet.mockImplementation(() => Promise.resolve({ data: { results: [{ enabled: true }, { enabled: false }, { enabled: true }] } }))
		const wrapper = mountPage({ cards: [{ id: 'Flows', label: 'Flows', route: 'Flows', status: '{on} on, {off} off', statusValues: { on: { url: '/apps/openregister/api/flows', path: 'results', where: { enabled: true } }, off: { url: '/apps/openregister/api/flows', path: 'results', where: { enabled: false } } } }] })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-link-card-status"]').text()).toBe('2 on, 1 off')
	})

	it('sums a field over the list, and picks the plural and zero forms by the count', async () => {
		mockGet.mockImplementation((url) => Promise.resolve({ data: url.includes('pipelines')
			? { results: [{ stages: [1, 2, 3] }, { stages: [1, 2] }] }
			: { total: url.includes('none') ? 0 : 2 } }))
		const wrapper = mountPage({ cards: [
			{ id: 'Pipelines', label: 'Pipelines', route: 'Pipelines', status: '{count} pipelines, {stages} stages', statusValues: { count: { url: '/apps/x/pipelines', path: 'results' }, stages: { url: '/apps/x/pipelines', path: 'results', sumOf: 'stages' } } },
			{ id: 'Broken', label: 'Broken', route: 'Broken', status: { text: '{count} connection has an error', plural: '{count} connections have an error', tone: 'error', zero: 'All connections work' }, statusValues: { count: { url: '/apps/x/broken' } } },
			{ id: 'None', label: 'None', route: 'None', status: { text: '{count} connection has an error', tone: 'error', zero: { text: 'All connections work', tone: 'success' } }, statusValues: { count: { url: '/apps/x/none' } } },
		] })
		await flushPromises()
		const pills = wrapper.findAll('[data-testid="cn-link-card-status"]')
		expect(pills.map((pill) => pill.text())).toEqual(['2 pipelines, 5 stages', '2 connections have an error', 'All connections work'])
		expect(pills[1].classes()).toContain('cn-link-cards-page__status--error')
		expect(pills[2].classes()).toContain('cn-link-cards-page__status--success')
	})

	it('leaves a status out while a value it names has not come, or could not be read', async () => {
		mockGet.mockImplementation(() => Promise.reject(new Error('down')))
		const wrapper = mountPage({ cards: cards.slice(1, 3) })
		await flushPromises()
		expect(wrapper.findAll('[data-testid="cn-link-card-status"]')).toHaveLength(0)
		expect(wrapper.findAll('[data-testid="cn-link-card"]')).toHaveLength(2)
	})

	it('closes with a panel: badge, text, link and the facts its visibleIf allows', () => {
		const panel = {
			label: 'For administrators',
			badge: { label: 'Administrators only', icon: 'ShieldAccountOutline' },
			text: 'The menu opens simple.',
			link: { label: 'Change the menu structure', href: '/settings/admin/pipelinq' },
			title: 'Menu structure',
			subtitle: 'As it is set now.',
			facts: [
				{ label: 'Menu', value: 'Simple', note: 'Nine items.', visibleIf: { 'menu.profile': 'simple' } },
				{ label: 'Menu', value: 'Extended', visibleIf: { 'menu.profile': 'full' } },
				{ label: 'Modules in the menu', value: '{runtime.menu.modulesOn}', note: 'Off: {runtime.menu.modulesOff}' },
			],
		}
		const wrapper = mountPage({ cards: [cards[4]], panel }, { menu: { profile: 'simple', modulesOn: 'Sales, Products', modulesOff: 'Marketing' } })
		const box = wrapper.find('[data-testid="cn-link-cards-panel"]')
		expect(box.attributes('aria-label')).toBe('For administrators')
		expect(wrapper.find('[data-testid="cn-link-cards-panel-badge"]').text()).toBe('Administrators only')
		expect(wrapper.find('[data-testid="cn-link-cards-panel-link"]').attributes('href')).toBe('/settings/admin/pipelinq')
		expect(wrapper.find('.cn-link-cards-page__panel-title').text()).toBe('Menu structure')
		const facts = wrapper.findAll('[data-testid="cn-link-cards-panel-fact"]').map((fact) => fact.text())
		expect(facts).toEqual(['Simple Nine items.', 'Sales, Products Off: Marketing'])
	})

	it('draws no panel when it is gated away', () => {
		const wrapper = mountPage({ cards: [cards[4]], panel: { text: 'x', permission: 'never' } })
		expect(wrapper.find('[data-testid="cn-link-cards-panel"]').exists()).toBe(false)
	})
})
