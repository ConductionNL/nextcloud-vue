/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The report cards in one titled panel under the board look (board DqRapportages).
 *
 * @spec openspec/changes/reports-page-panel/specs/reports-page-panel/spec.md
 */

import { mount } from '@vue/test-utils'
import CnReportsPage from '../../src/components/CnReportsPage/CnReportsPage.vue'

const config = {
	panel: { title: 'Reports', subtitle: 'Grouped on a field', link: { label: 'Set up', href: '/settings' } },
	cards: [
		{ id: 'time', label: 'Processing time', route: 'Time', description: 'Per month', meta: 'Grouping: case type' },
		{ id: 'archive', label: 'Archiving', route: 'Cases', query: { done: 'true' } },
		{ id: 'cost', label: 'Costs', href: '/apps/shillinq/', tone: 'external', pill: 'Shillinq', linkLabel: 'Open', requiresApp: 'shillinq', missingText: 'Shillinq is not installed.' },
	],
}

function factory(look, extra = {}) {
	const resolve = jest.fn((location) => ({ href: `/${location.name}?${JSON.stringify(location.query || {})}` }))
	const wrapper = mount(CnReportsPage, {
		props: { look, page: { config: { ...config, ...extra } } },
		global: { mocks: { $router: { resolve, push: jest.fn() } }, stubs: { CnBuildiqEditButton: { template: '<i class="square" />' } } },
	})
	return { wrapper, resolve }
}

describe('CnReportsPage panel', () => {
	afterEach(() => {
		delete global.OC
	})

	it('draws the cards in one panel with its heading and link, and the buildiq square', () => {
		const { wrapper } = factory('board')
		const panel = wrapper.find('[data-testid="cn-reports-panel"]')
		expect(panel.exists()).toBe(true)
		expect(panel.text()).toContain('Grouped on a field')
		expect(wrapper.find('[data-testid="cn-reports-panel-link"]').attributes('href')).toBe('/settings')
		expect(wrapper.findAll('[data-testid="cn-report-card"]')).toHaveLength(3)
		expect(wrapper.find('.square').exists()).toBe(true)
	})

	it('resolves a card by route name with its query', () => {
		const { wrapper } = factory('board')
		expect(wrapper.html()).toContain('/Cases?{&quot;done&quot;:&quot;true&quot;}')
	})

	it('says so, without a link, when the app of a card is missing', () => {
		const { wrapper } = factory('board')
		const missing = wrapper.findAll('[data-testid="cn-report-card"]').at(2)
		expect(missing.find('[data-testid="cn-report-unavailable"]').text()).toBe('Shillinq is not installed.')
		expect(missing.find('a').exists()).toBe(false)
	})

	it('links the card when its app is installed', () => {
		global.OC = { appswebroots: { shillinq_panel_test: '/apps/x' } }
		const { wrapper } = factory('board', {
			cards: [{ id: 'cost', label: 'Costs', href: '/apps/x/', requiresApp: 'shillinq_panel_test', linkLabel: 'Open', missingText: 'No' }],
		})
		expect(wrapper.find('[data-testid="cn-report-unavailable"]').exists()).toBe(false)
		expect(wrapper.findAll('[data-testid="cn-report-card"] a').at(1).attributes('href')).toBe('/apps/x/')
	})

	it('leaves the Nextcloud look as it was, without the card of a missing app', () => {
		const { wrapper } = factory('nextcloud')
		expect(wrapper.find('[data-testid="cn-reports-panel"]').exists()).toBe(false)
		expect(wrapper.findAll('[data-testid="cn-report-card"]')).toHaveLength(2)
		expect(wrapper.find('.square').exists()).toBe(false)
	})
})
