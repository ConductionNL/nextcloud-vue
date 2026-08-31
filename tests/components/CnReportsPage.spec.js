/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnReportsPage — the `type: "reports"` page primitive: an app's
 * reports as cards on one page, with a category filter, instead of a Reports
 * submenu that grows one entry per report and never shrinks.
 *
 * @spec hydra openspec/architecture/adr-112-reports-are-one-page.md (ConductionNL/hydra#640)
 */

import { mount } from '@vue/test-utils'

import CnReportsPage from '../../src/components/CnReportsPage/CnReportsPage.vue'

/**
 * A router double that records what was pushed.
 *
 * @param {Array<object>} pushed Sink for pushed routes.
 * @return {object} The double.
 */
function router(pushed) {
	return {
		push: (to) => pushed.push(to),
		resolve: ({ name }) => ({ href: `/resolved/${name}` }),
	}
}

/**
 * Mount the page with a config.
 *
 * @param {object} config The page config.
 * @param {Array<object>} pushed Sink for pushed routes.
 * @return {object} The wrapper.
 */
function mountPage(config, pushed = []) {
	return mount(CnReportsPage, {
		props: { page: { id: 'Reports', title: 'Reports', config } },
		global: { mocks: { $router: router(pushed) } },
	})
}

const CARDS = {
	categories: { operational: 'Operational', compliance: 'Compliance' },
	cards: [
		{ id: 'a', label: 'Processing time', category: 'operational', route: 'Doorlooptijd' },
		{ id: 'b', label: 'Process mining', category: 'operational', route: 'ProcessMining' },
		{ id: 'c', label: 'Audit trail', category: 'compliance', route: 'AuditTrail' },
	],
}

describe('CnReportsPage', () => {
	it('renders one card per declared report', () => {
		const wrapper = mountPage(CARDS)

		expect(wrapper.findAll('[data-testid="cn-report-card"]')).toHaveLength(3)
	})

	it('drops a card that names no route', () => {
		// A card with no route cannot be opened. Rendering it would put a
		// report on the page that silently does nothing.
		const wrapper = mountPage({
			...CARDS,
			cards: [...CARDS.cards, { id: 'd', label: 'Broken' }],
		})

		expect(wrapper.findAll('[data-testid="cn-report-card"]')).toHaveLength(3)
	})

	it('filters the cards by category', async () => {
		const wrapper = mountPage(CARDS)

		await wrapper.find('[data-testid="cn-reports-category"]').setValue('compliance')

		const cards = wrapper.findAll('[data-testid="cn-report-card"]')
		expect(cards).toHaveLength(1)
		expect(cards[0].text()).toContain('Audit trail')
	})

	it('offers only categories that actually hold a card', () => {
		// A filter listing empty categories teaches the reader the app has
		// reports it does not have.
		const wrapper = mountPage({
			categories: { operational: 'Operational', empty: 'Nothing here' },
			cards: [CARDS.cards[0]],
		})

		const values = wrapper.findAll('[data-testid="cn-reports-category"] option')
			.map((o) => o.element.value)
		expect(values).toEqual(['all', 'operational'])
	})

	it('navigates by route NAME, not by path', async () => {
		// A path is editable per app; a card pointing at a stale one is a dead
		// end that still looks like a report.
		const pushed = []
		const wrapper = mountPage(CARDS, pushed)

		await wrapper.findAll('[data-testid="cn-report-card"]')[0].trigger('click')

		expect(pushed).toEqual([{ name: 'Doorlooptijd' }])
	})

	it('renders each card as a real link', () => {
		// So a reader can middle-click or open a report in a new tab.
		const wrapper = mountPage(CARDS)

		expect(wrapper.findAll('[data-testid="cn-report-card"]')[0].attributes('href'))
			.toBe('/resolved/Doorlooptijd')
	})

	it('says so when a category holds nothing', async () => {
		const wrapper = mountPage(CARDS)

		await wrapper.find('[data-testid="cn-reports-category"]').setValue('compliance')
		await wrapper.setProps({ page: { id: 'Reports', config: { ...CARDS, cards: [] } } })

		expect(wrapper.find('[data-testid="cn-reports-empty"]').exists()).toBe(true)
	})

	it('renders nothing rather than throwing when no cards are declared', () => {
		const wrapper = mountPage({})

		expect(wrapper.find('[data-testid="cn-reports-empty"]').exists()).toBe(true)
	})
})
