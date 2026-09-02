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

	// The manifest is data the renderer walks, not source the string
	// extractor reads. Every string it carries has to be handed to the app's
	// own translate function, or the page renders its source language
	// whatever locale the reader is in. These cover each rendered field,
	// because the defect is per-field: translating the card titles and
	// forgetting the category names still leaves a half-translated screen.
	describe('manifest strings reach the app translate function', () => {
		/**
		 * Mount with a translator that marks whatever it is handed.
		 *
		 * @param {object} config The page config.
		 * @return {object} The wrapper and the recorded keys.
		 */
		function mountTranslated(config) {
			const asked = []
			const wrapper = mount(CnReportsPage, {
				props: {
					page: { id: 'Reports', title: 'Reports', config },
					translate: (key) => {
						asked.push(key)

						return `NL:${key}`
					},
				},
				global: { mocks: { $router: router([]) } },
			})

			return { wrapper, asked }
		}

		const RICH = {
			description: 'Every report, in one place.',
			categories: { operational: 'Operational' },
			cards: [{
				id: 'a',
				label: 'Processing time',
				description: 'How long cases take.',
				category: 'operational',
				route: 'Doorlooptijd',
			}],
		}

		it('translates the card title, its description and its category', () => {
			const { wrapper } = mountTranslated(RICH)
			const card = wrapper.find('[data-testid="cn-report-card"]')

			expect(card.text()).toContain('NL:Processing time')
			expect(card.text()).toContain('NL:How long cases take.')
			expect(card.text()).toContain('NL:Operational')
		})

		it('translates the page description and the category filter options', () => {
			const { wrapper } = mountTranslated({
				...RICH,
				categories: { operational: 'Operational', compliance: 'Compliance' },
				cards: [
					...RICH.cards,
					{ id: 'b', label: 'Audit trail', category: 'compliance', route: 'AuditTrail' },
				],
			})

			expect(wrapper.find('.cn-reports-page__description').text())
				.toBe('NL:Every report, in one place.')
			expect(wrapper.find('[data-testid="cn-reports-category"]').text())
				.toContain('NL:Operational')
		})

		it('asks for every declared string, not merely some of them', () => {
			const { asked } = mountTranslated(RICH)

			expect(asked).toEqual(expect.arrayContaining([
				'Every report, in one place.',
				'Processing time',
				'How long cases take.',
				'Operational',
			]))
		})

		it('leaves the strings alone when no translator is provided', () => {
			// The injected default is identity, so a page mounted outside a
			// CnAppRoot still renders rather than throwing on a missing inject.
			const wrapper = mountPage(RICH)

			expect(wrapper.find('[data-testid="cn-report-card"]').text())
				.toContain('Processing time')
		})
	})
})

/**
 * Mount the page the way CnPageRenderer actually dispatches it: `page.config.*`
 * flattened into individual props, and NO `page` prop at all.
 *
 * @param {object} config The page config, as the renderer would flatten it.
 * @param {Array<object>} pushed Sink for pushed routes.
 * @return {object} The wrapper.
 */
function mountAsRenderer(config, pushed = []) {
	return mount(CnReportsPage, {
		props: { ...config },
		global: { mocks: { $router: router(pushed) } },
	})
}

/*
 * THE DISPATCHED PATH, which had no coverage and did not work.
 *
 * Every test above hands the component a `page` prop. CnPageRenderer never
 * does: `resolvedProps()` returns `{ ...topLevel, ...normalizedConfig,
 * ...params }`, with no `page` key. So the component fell back to its
 * `default: () => ({})`, `config` resolved to `{}`, and every `type: "reports"`
 * page in the fleet rendered "No reports in this category." while its manifest
 * declared cards.
 *
 * pipelinq is the measured case: four cards declared, an empty state rendered,
 * and three e2e tests failing on a page that mounts perfectly well.
 */
describe('CnReportsPage — dispatched by CnPageRenderer', () => {
	it('renders the declared cards when config arrives as flattened props', () => {
		const wrapper = mountAsRenderer(CARDS)

		expect(wrapper.findAll('[data-testid="cn-report-card"]')).toHaveLength(3)
		expect(wrapper.find('[data-testid="cn-reports-empty"]').exists()).toBe(false)
	})

	it('renders the description the renderer lifted out of config', () => {
		const wrapper = mountAsRenderer({
			...CARDS,
			description: 'Every report Pipelinq offers, in one place.',
		})

		expect(wrapper.text()).toContain('Every report Pipelinq offers, in one place.')
	})

	it('uses the title the renderer lifted off the page', () => {
		const wrapper = mountAsRenderer({ ...CARDS, title: 'Reports' })

		expect(wrapper.find('.cn-reports-page__title').text()).toBe('Reports')
	})

	it('offers the category filter built from the flattened categories', () => {
		const wrapper = mountAsRenderer(CARDS)
		const options = wrapper.findAll('[data-testid="cn-reports-category"] option')

		// all + operational + compliance
		expect(options).toHaveLength(3)
	})

	it('still reads a whole page when a host passes one directly', () => {
		const wrapper = mountPage(CARDS)

		expect(wrapper.findAll('[data-testid="cn-report-card"]')).toHaveLength(3)
	})

	it('lets the flattened props win over a page carrying different config', () => {
		// Both directions at once. The renderer's props are the nearer
		// declaration and have already had route sentinels resolved, so they
		// are the ones that must be rendered.
		const wrapper = mount(CnReportsPage, {
			props: {
				page: { id: 'Reports', config: { cards: [] } },
				cards: CARDS.cards,
				categories: CARDS.categories,
			},
			global: { mocks: { $router: router([]) } },
		})

		expect(wrapper.findAll('[data-testid="cn-report-card"]')).toHaveLength(3)
	})
})
