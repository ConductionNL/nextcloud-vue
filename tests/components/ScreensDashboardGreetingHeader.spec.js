/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * screens-dashboard-greeting-header: the DqMijnWerk header. The greeting and
 * the date sit in the header subtitle (`greeting`), the board look moves the
 * view switch onto a row under the header with `viewLinks` as pills right of
 * it, and `showActionsMenu: false` drops the page Actions menu. Without the
 * keys the header renders as before.
 *
 * @spec openspec/changes/screens-dashboard-greeting-header/specs/dashboard-page/spec.md
 */
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'pieter', displayName: 'Pieter Jansen' })) }))

import { mount } from '@vue/test-utils'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'

const VIEWS = [
	{ id: 'mine', label: 'My work', widgets: [], layout: [] },
	{ id: 'team', label: 'My team', widgets: [], layout: [] },
]

const stubs = {
	CnDashboardGrid: { props: ['layout'], template: '<div class="grid" />' },
	CnWidgetWrapper: { template: '<div><slot /></div>' },
	NcButton: { template: '<button class="edit-stub"><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
	CnActionsMenu: { template: '<div class="actions-menu-stub" />' },
	CnBuildiqEditButton: { template: '<div class="buildiq-stub" />' },
	RouterLink: { props: ['to'], template: '<a class="router-link-stub" :data-to="JSON.stringify(to)"><slot /></a>' },
}

/**
 * @param {object} props page props
 * @param {boolean} isBoard board look on
 * @return {object} wrapper
 */
function mountPage(props = {}, isBoard = true) {
	return mount(CnDashboardPage, {
		propsData: { title: 'My work', pageId: 'mywork', widgets: [], layout: [], ...props },
		global: {
			stubs,
			mocks: { $route: { name: 'MyWork', query: {} }, $router: { replace: jest.fn(async () => {}), push: jest.fn() } },
			provide: isBoard ? { cnLook: 'board' } : {},
		},
	})
}

const SUBTITLE = '[data-testid="cn-dashboard-page-subtitle"]'
const ROW = '[data-testid="cn-dashboard-page-switch-row"]'
const SWITCH = '[data-testid="cn-dashboard-page-view-switch"]'

describe('CnDashboardPage: greeting in the header subtitle', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		jest.setSystemTime(new Date(2026, 9, 5, 14, 30))
	})
	afterEach(() => {
		jest.useRealTimers()
	})

	it('greets with the first name and writes the date out, then the description', () => {
		const w = mountPage({ greeting: true, description: 'website and portal' })
		const text = w.find(SUBTITLE).text()
		expect(text.startsWith('Good afternoon, Pieter · ')).toBe(true)
		expect(text).toContain('2026')
		expect(text).toContain('October')
		expect(text.endsWith(' · website and portal')).toBe(true)
		expect(w.find('h1').text()).toBe('My work')
	})

	it('uses the full name with greeting "full" and the morning before noon', () => {
		jest.setSystemTime(new Date(2026, 9, 5, 9, 0))
		const w = mountPage({ greeting: 'full' })
		expect(w.find(SUBTITLE).text().startsWith('Good morning, Pieter Jansen · ')).toBe(true)
	})

	it('keeps the description alone without greeting, as before', () => {
		const w = mountPage({ description: 'What needs attention today' })
		expect(w.find(SUBTITLE).text()).toBe('What needs attention today')
	})
})

describe('CnDashboardPage: the switch row', () => {
	beforeEach(() => {
		localStorage.clear()
	})

	it('puts the view switch on a row under the header in the board look, not among the header actions', () => {
		const w = mountPage({ views: VIEWS })
		const row = w.find(ROW)
		expect(row.exists()).toBe(true)
		expect(row.find(SWITCH).exists()).toBe(true)
		expect(w.find('.cn-dashboard-page__header-actions').find(SWITCH).exists()).toBe(false)
	})

	it('draws viewLinks as pills right of the switch, translated, route or href', () => {
		const w = mount(CnDashboardPage, {
			propsData: {
				title: 'My work',
				widgets: [],
				layout: [],
				views: VIEWS,
				viewLinks: [
					{ label: 'Your queue', icon: 'TrayFull', route: 'Queue' },
					{ label: 'Assigned to me', route: { name: 'Cases', query: { assignee: 'me' } } },
					{ label: 'Close the day', href: '/apps/dossiq/day' },
					{ label: 'No target' },
					{ route: 'NoLabel' },
				],
			},
			global: {
				stubs,
				mocks: { $route: { name: 'MyWork', query: {} }, $router: { replace: jest.fn(async () => {}), push: jest.fn() } },
				provide: { cnLook: 'board', cnTranslate: (key) => ({ 'Your queue': 'Uw wachtrij' })[key] || key },
			},
		})
		const pills = w.findAll('[data-testid="cn-dashboard-page-view-link"]')
		expect(pills).toHaveLength(3)
		expect(pills[0].text()).toBe('Uw wachtrij')
		expect(pills[0].attributes('data-to')).toBe(JSON.stringify({ name: 'Queue' }))
		expect(pills[1].attributes('data-to')).toBe(JSON.stringify({ name: 'Cases', query: { assignee: 'me' } }))
		expect(pills[2].element.tagName).toBe('A')
		expect(pills[2].attributes('href')).toBe('/apps/dossiq/day')
		const row = w.find(ROW).element
		const order = [...row.children].map((el) => el.getAttribute('data-testid') || el.className)
		expect(order[0]).toBe('cn-dashboard-page-view-switch')
		expect(order[order.length - 1]).toBe('cn-dashboard-page-view-link')
	})

	it('keeps the switch in the header without the board look and draws no row without links', () => {
		const w = mountPage({ views: VIEWS }, false)
		expect(w.find(ROW).exists()).toBe(false)
		expect(w.find('.cn-dashboard-page__header-actions').find(SWITCH).exists()).toBe(true)
	})

	it('draws no row on a board page without views or links', () => {
		expect(mountPage().find(ROW).exists()).toBe(false)
	})
})

describe('CnDashboardPage: showActionsMenu', () => {
	it('draws the page Actions menu by default', () => {
		expect(mountPage().find('.actions-menu-stub').exists()).toBe(true)
	})

	it('drops it with showActionsMenu false', () => {
		expect(mountPage({ showActionsMenu: false }).find('.actions-menu-stub').exists()).toBe(false)
	})
})
