/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnReportsPage `catalogue` under the board look (board PqReports): the title
 * as the page's h1, the categories as chips with counts that narrow the
 * sections, each card with its category, a footer line and an Open link, and
 * an aside with the category index and a note. Without `catalogue` the board
 * look keeps its sections (DcRapportages).
 *
 * @spec openspec/changes/reports-page-catalogue/specs/reports-page-catalogue/spec.md#requirement-a-board-reports-page-can-be-a-catalogue
 */

import { mount } from '@vue/test-utils'
import CnReportsPage from '../../src/components/CnReportsPage/CnReportsPage.vue'

const CONFIG = {
	catalogue: true,
	description: 'Every report.',
	categories: { volume: 'Volume and channels', people: 'People and performance', empty: 'Nothing here' },
	cards: [
		{ id: 'r', label: 'Reporting', category: 'volume', route: 'Rapportage', icon: 'ChartBoxOutline', description: 'Totals and trends.' },
		{ id: 'c', label: 'Channels', category: 'volume', route: 'Channels' },
		{ id: 'a', label: 'Agents', category: 'people', route: 'Agents' },
	],
	asideNote: { title: 'Missing a report?', text: 'Build one yourself.' },
}

/**
 * @param {object} [config] The page config.
 * @return {object} The mounted page.
 */
function mountPage(config = CONFIG) {
	return mount(CnReportsPage, {
		props: { page: { id: 'Reports', title: 'Reports', config } },
		global: {
			provide: { cnLook: 'board' },
			mocks: { $router: { push: () => Promise.resolve(), resolve: ({ name }) => ({ href: `/r/${name}` }) } },
			stubs: { CnIcon: { props: ['name'], template: '<i class="icon-stub" :data-name="name" />' }, CnBuildiqEditButton: true },
		},
	})
}

describe('CnReportsPage: the catalogue', () => {
	it('draws the title as the h1 and the categories as chips with their counts', () => {
		const w = mountPage()
		expect(w.classes()).toContain('cn-reports-page--catalogue')
		expect(w.find('h1.cn-reports-page__title').text()).toBe('Reports')
		const chips = w.findAll('.cn-reports-page__chip')
		expect(chips.map((chip) => chip.text())).toEqual(['All categories3', 'Volume and channels2', 'People and performance1'])
		expect(chips[0].attributes('aria-pressed')).toBe('true')
	})

	it('narrows the sections to the chip pressed', async () => {
		const w = mountPage()
		expect(w.findAll('[data-testid="cn-reports-section"]')).toHaveLength(2)
		await w.find('[data-testid="cn-reports-chip-people"]').trigger('click')
		const sections = w.findAll('[data-testid="cn-reports-section"]')
		expect(sections).toHaveLength(1)
		expect(sections[0].find('h2').text()).toBe('People and performance')
	})

	it('draws each card with its category, a footer line and an Open link to its route', () => {
		const card = mountPage().find('[data-testid="cn-report-card"]')
		expect(card.find('.cn-reports-page__card-title').text()).toBe('Reporting')
		expect(card.find('.cn-reports-page__card-category').text()).toBe('Volume and channels')
		expect(card.find('.cn-reports-page__card-meta').text()).toBe('Opens a page of its own')
		const open = card.find('[data-testid="cn-report-open"]')
		expect(open.attributes('href')).toBe('/r/Rapportage')
		expect(open.attributes('aria-label')).toBe('Open Reporting')
	})

	it('draws an aside with the category index and the note', () => {
		const aside = mountPage().find('[data-testid="cn-reports-aside"]')
		expect(aside.findAll('.cn-reports-page__index-link').map((link) => link.text())).toEqual(['Volume and channels2', 'People and performance1'])
		expect(aside.find('[data-testid="cn-reports-aside-note"]').text()).toContain('Missing a report?')
	})

	it('keeps the sectioned board look without catalogue', () => {
		const w = mountPage({ ...CONFIG, catalogue: false })
		expect(w.classes()).not.toContain('cn-reports-page--catalogue')
		expect(w.find('[data-testid="cn-reports-chips"]').exists()).toBe(false)
		expect(w.find('a[data-testid="cn-report-card"]').exists()).toBe(true)
	})
})
