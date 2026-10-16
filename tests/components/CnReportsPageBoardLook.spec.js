/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnReportsPage under the board look (board PqReports): category chips with
 * counts, one section per category under a small caption, uncategorised cards
 * first under no caption, cards with an icon tile, a footer note and an Open
 * link, a side column and a footnote. Without the look the page is unchanged.
 *
 * @spec openspec/changes/screens-reports-page-pq-board/specs/reports-page/spec.md#requirement-the-reports-page-draws-board-pqreports
 */

import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnReportsPage from '../../src/components/CnReportsPage/CnReportsPage.vue'

const CONFIG = {
	description: 'Choose a report.',
	categories: { decisions: 'Decisions and votes', meetings: 'Meetings and people', empty: 'Nothing here' },
	cards: [
		{ id: 'v', label: 'Votes', category: 'decisions', route: 'Votes', icon: 'VoteOutline', description: 'How rounds ended.' },
		{ id: 'm', label: 'Attendance', category: 'meetings', route: 'Attendance', icon: 'CalendarCheck' },
		{ id: 'd', label: 'Decisions', category: 'decisions', route: 'Decisions' },
		{ id: 'x', label: 'Overview', route: 'Overview' },
	],
}

function mountPage(look, config = CONFIG) {
	return mount(CnReportsPage, {
		props: { page: { id: 'Reports', title: 'Reports', config } },
		global: {
			provide: { cnLook: look },
			mocks: { $router: { push: () => Promise.resolve(), resolve: ({ name }) => ({ href: `/r/${name}` }) } },
			stubs: { CnIcon: { props: ['name'], template: '<i class="icon-stub" :data-name="name" />' } },
		},
	})
}

describe('CnReportsPage: the board look', () => {
	it('draws one section per category in the declared order, uncategorised first, under small captions', () => {
		const w = mountPage('board')
		expect(w.classes()).toContain('cn-reports-page--board')
		expect(w.find('[data-testid="cn-reports-category"]').exists()).toBe(false)
		const sections = w.findAll('[data-testid="cn-reports-section"]')
		expect(sections).toHaveLength(3)
		expect(sections.map((s) => (s.find('h3').exists() ? s.find('h3').text() : ''))).toEqual(['', 'Decisions and votes', 'Meetings and people'])
		expect(sections[1].findAll('.cn-reports-page__card-title').map((t) => t.text())).toEqual(['Votes', 'Decisions'])
		expect(sections[1].attributes('aria-labelledby')).toBe(sections[1].find('h3').attributes('id'))
	})

	it('draws a card with an icon tile, its category, its description, a footer note and an Open link', () => {
		const w = mountPage('board')
		const votes = w.findAll('[data-testid="cn-report-card"]').find((c) => c.text().includes('Votes'))
		expect(votes.element.tagName).toBe('ARTICLE')
		expect(votes.find('.cn-reports-page__card-icon .icon-stub').attributes('data-name')).toBe('VoteOutline')
		expect(votes.find('.cn-reports-page__card-category').text()).toBe('Decisions and votes')
		expect(votes.find('.cn-reports-page__card-description').text()).toBe('How rounds ended.')
		expect(votes.find('.cn-reports-page__card-note').text()).toBe('Opens its own page')
		const open = votes.find('[data-testid="cn-report-open"]')
		expect(open.attributes('href')).toBe('/r/Votes')
		expect(open.attributes('aria-label')).toBe('Open Votes')
		expect(open.text()).toBe('Open')
	})

	it('draws the fallback icon for a card without one, and a card\'s own note', () => {
		const w = mountPage('board', { ...CONFIG, cards: [...CONFIG.cards, { id: 'n', label: 'Nightly', route: 'Nightly', note: 'Refreshed nightly' }] })
		const decisions = w.findAll('[data-testid="cn-report-card"]').find((c) => c.find('.cn-reports-page__card-title').text() === 'Decisions')
		expect(decisions.find('.cn-reports-page__card-icon').exists()).toBe(true)
		expect(decisions.find('.cn-reports-page__card-icon .icon-stub').exists()).toBe(false)
		const nightly = w.findAll('[data-testid="cn-report-card"]').find((c) => c.text().includes('Nightly'))
		expect(nightly.find('.cn-reports-page__card-note').text()).toBe('Refreshed nightly')
	})

	it('draws category chips with counts, and a chip narrows the sections to its category', async () => {
		const w = mountPage('board')
		const chips = w.findAll('[data-testid="cn-reports-chips"] button')
		expect(chips.map((c) => c.text().replace(/\s+/g, ' '))).toEqual(['All categories 4', 'Decisions and votes 2', 'Meetings and people 1'])
		expect(chips[0].attributes('aria-pressed')).toBe('true')
		await chips[2].trigger('click')
		expect(w.find('[data-testid="cn-reports-chip-meetings"]').attributes('aria-pressed')).toBe('true')
		const sections = w.findAll('[data-testid="cn-reports-section"]')
		expect(sections).toHaveLength(1)
		expect(sections[0].find('h3').text()).toBe('Meetings and people')
	})

	it('draws a side column listing the categories with counts and the default note', async () => {
		const w = mountPage('board')
		const rows = w.findAll('[data-testid="cn-reports-aside-categories"] a')
		expect(rows.map((r) => [r.find('.cn-reports-page__aside-label').text(), r.find('.cn-reports-page__aside-count').text()])).toEqual([['Decisions and votes', '2'], ['Meetings and people', '1']])
		expect(rows[0].attributes('href')).toBe('#cn-reports-Reports-decisions')
		expect(w.find('[data-testid="cn-reports-side-note"] h3').text()).toBe('Missing a report?')
		await rows[1].trigger('click')
		expect(w.findAll('[data-testid="cn-reports-section"]')).toHaveLength(1)
	})

	it('takes a declared side note and footnote, and draws no note for sideNote false and no footnote by default', () => {
		const declared = mountPage('board', { ...CONFIG, sideNote: { title: 'Need another?', text: 'Build one yourself.' }, footnote: 'Figures refresh nightly.' })
		expect(declared.find('[data-testid="cn-reports-side-note"]').text()).toContain('Need another?')
		expect(declared.find('[data-testid="cn-reports-side-note"]').text()).toContain('Build one yourself.')
		expect(declared.find('[data-testid="cn-reports-footnote"]').text()).toBe('Figures refresh nightly.')
		const off = mountPage('board', { ...CONFIG, sideNote: false })
		expect(off.find('[data-testid="cn-reports-side-note"]').exists()).toBe(false)
		expect(off.find('[data-testid="cn-reports-footnote"]').exists()).toBe(false)
	})

	it('takes footnote and sideNote as flattened props, as CnPageRenderer passes them', () => {
		const w = mount(CnReportsPage, {
			props: { cards: CONFIG.cards, categories: CONFIG.categories, footnote: 'From props.', sideNote: false },
			global: { provide: { cnLook: 'board' }, stubs: { CnIcon: true } },
		})
		expect(w.find('[data-testid="cn-reports-footnote"]').text()).toBe('From props.')
		expect(w.find('[data-testid="cn-reports-side-note"]').exists()).toBe(false)
	})

	it('keeps the Nextcloud look as it was: the filter, one grid, the category line', () => {
		const w = mountPage('nextcloud')
		expect(w.classes()).not.toContain('cn-reports-page--board')
		expect(w.find('[data-testid="cn-reports-category"]').exists()).toBe(true)
		expect(w.findAll('[data-testid="cn-reports-section"]')).toHaveLength(0)
		expect(w.findAll('[data-testid="cn-report-card"]')).toHaveLength(4)
		expect(w.find('.cn-reports-page__card-icon').exists()).toBe(false)
		expect(w.find('[data-testid="cn-reports-chips"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-reports-aside"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-reports-footnote"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-report-card"]').element.tagName).toBe('A')
	})

	it('shows the empty label under the board look when no card is usable', () => {
		const w = mountPage('board', { cards: [{ id: 'z', label: 'No route' }] })
		expect(w.find('[data-testid="cn-reports-empty"]').exists()).toBe(true)
	})

	it('scopes the board rules under the look class with the page guard', () => {
		const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-reports.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
		expect(css).toMatch(/\.cn-look-board \.cn-reports-page:not\(\.cn-look-nextcloud \*\) \.cn-reports-page__title \{[^}]*font-size: 28px/)
		expect(css).toMatch(/__section-title \{[^}]*font-size: 13px[^}]*text-transform: uppercase/)
		expect(css).toMatch(/__grid \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/)
		expect(css).toMatch(/__aside \{[^}]*max-width: 300px/)
		expect(css).toMatch(/__card-icon \{[^}]*width: 40px/)
		const index = fs.readFileSync(path.join(__dirname, '../../src/css/index.css'), 'utf8')
		expect(index).toContain("@import './look-board-reports.css';")
	})
})
