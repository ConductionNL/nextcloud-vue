/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * view-title: a dashboard view can carry a `title`, and the page title follows
 * the open view ("Mijn team", board DqMijnTeam). A view without one keeps the
 * page title.
 *
 * @spec openspec/changes/view-title/specs/view-switch-containers/spec.md#requirement-the-page-title-follows-the-open-view
 */
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

const VIEWS = [
	{ id: 'mine', label: 'My work', widgets: [], layout: [] },
	{ id: 'team', label: 'My team', title: 'Team work', widgets: [], layout: [] },
]

/**
 * @param {object} query The route query.
 * @return {object} Wrapper.
 */
function mountPage(query) {
	return mount(CnDashboardPage, {
		props: { title: 'My work', pageId: 'mywork', widgets: [], layout: [], views: VIEWS },
		global: {
			stubs: { CnDashboardGrid: { template: '<div />' }, CnWidgetWrapper: { template: '<div><slot /></div>' } },
			mocks: { $route: { name: 'MyWork', query }, $router: { replace: jest.fn(async () => {}), push: jest.fn() } },
			provide: { cnLook: 'board', cnTranslate: (key) => (key === 'Team work' ? 'Mijn team' : key) },
		},
	})
}

describe('CnDashboardPage: the title follows the open view', () => {
	beforeEach(() => {
		localStorage.clear()
	})

	it('shows the open view\'s title, translated', () => {
		expect(mountPage({ view: 'team' }).find('h1').text()).toBe('Mijn team')
	})

	it('keeps the page title for a view without one', () => {
		expect(mountPage({ view: 'mine' }).find('h1').text()).toBe('My work')
	})
})
